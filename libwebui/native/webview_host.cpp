// webview_host.exe - WebView2 host for libwebui
//
// Backend swap: libwebui used to render via webui-2.dll (https://webui.me/).
// This host renders the same generated HTML via https://github.com/webview/webview
// (WebView2 under the hood) so we control the native window directly and can
// create a clean frameless window from the start instead of mutating an
// already-created webui window afterwards.
//
// Everything else in libwebui is unchanged: Toba still generates the HTML,
// injects the WebSocket bridge (WithBridge) and polls events via BridgePoll.
// This host only displays the page and handles native window actions.
//
// Arguments:
//   --html=PATH       path to the HTML file to display (preferred for big pages)
//   --title=TEXT      window title
//   --width=N         client width
//   --height=N        client height
//   --x=N --y=N       window position (-1 = default/center)
//   --debug=0|1       open devtools / enable debug
//   --frameless=0|1   borderless window with HTML titlebar drag/resize
//
// JS bridge exposed to the page:
//   window.nativeWindowAction("minimize"|"maximize"|"restore"|"drag"|"close")
//   The titlebar widget calls window.webviewNativeAction(...) which forwards here.

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <windowsx.h>
#include <string>
#include <cstring>
#include <cstdlib>
#include <dwmapi.h>

#include "webview/webview.h"

// DWM rounded-corners (Windows 11). Declared locally so we don't depend on a
// recent Windows SDK being present.
#ifndef DWMWA_WINDOW_CORNER_PREFERENCE
#define DWMWA_WINDOW_CORNER_PREFERENCE 33
#endif
#ifndef DWMWCP_ROUND
#define DWMWCP_DEFAULT   0
#define DWMWCP_DONOTROUND 1
#define DWMWCP_ROUND     2
#define DWMWCP_ROUNDSMALL 3
#endif

// ----- frameless window state -------------------------------------------------

static int   g_frameless   = 0;
static HWND  g_hwnd        = nullptr;
static const int kTitleBarHeight = 34; // must match widgets/window_titlebar.to
static const int kResizeBorder   = 7;

static WNDPROC g_orig_wndproc = nullptr;

// Custom window proc layered on top of webview's own proc, used only when
// frameless: it provides resize borders and a draggable title strip via
// WM_NCHITTEST so the HTML titlebar behaves like a real one.
static LRESULT CALLBACK frameless_proc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp) {
  if (msg == WM_NCCALCSIZE && wp == TRUE) {
    // Remove the non-client frame entirely (no native title bar / borders),
    // but keep the window resizable. Returning 0 makes the whole window client.
    return 0;
  }

  if (msg == WM_NCHITTEST) {
    POINT pt;
    pt.x = GET_X_LPARAM(lp);
    pt.y = GET_Y_LPARAM(lp);
    RECT rc;
    if (GetWindowRect(hwnd, &rc)) {
      bool left   = pt.x >= rc.left   && pt.x <  rc.left   + kResizeBorder;
      bool right  = pt.x <= rc.right  && pt.x >  rc.right  - kResizeBorder;
      bool top    = pt.y >= rc.top    && pt.y <  rc.top    + kResizeBorder;
      bool bottom = pt.y <= rc.bottom && pt.y >  rc.bottom - kResizeBorder;

      if (top && left)     return HTTOPLEFT;
      if (top && right)    return HTTOPRIGHT;
      if (bottom && left)  return HTBOTTOMLEFT;
      if (bottom && right) return HTBOTTOMRIGHT;
      if (left)            return HTLEFT;
      if (right)           return HTRIGHT;
      if (top)             return HTTOP;
      if (bottom)          return HTBOTTOM;

      // Title strip drag is handled in JS (mousedown -> nativeWindowAction
      // 'drag' -> WM_NCLBUTTONDOWN HTCAPTION), which is reliable inside
      // WebView2. We only provide resize borders here.
    }
    return HTCLIENT;
  }

  if (g_orig_wndproc) {
    return CallWindowProcW(g_orig_wndproc, hwnd, msg, wp, lp);
  }
  return DefWindowProcW(hwnd, msg, wp, lp);
}

static void apply_frameless(HWND hwnd) {
  if (!hwnd) return;
  LONG_PTR style = GetWindowLongPtrW(hwnd, GWL_STYLE);
  style &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX |
             WS_SYSMENU);
  // WS_POPUP + a thick frame style for resizing handled by our NCHITTEST.
  style |= WS_POPUP | WS_THICKFRAME | WS_CLIPCHILDREN | WS_CLIPSIBLINGS;
  SetWindowLongPtrW(hwnd, GWL_STYLE, style);

  g_orig_wndproc = (WNDPROC)GetWindowLongPtrW(hwnd, GWLP_WNDPROC);
  SetWindowLongPtrW(hwnd, GWLP_WNDPROC, (LONG_PTR)frameless_proc);

  // Rounded corners with the proper system shadow (Windows 11).
  DWORD pref = DWMWCP_ROUND;
  DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, &pref,
                        sizeof(pref));

  SetWindowPos(hwnd, nullptr, 0, 0, 0, 0,
               SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
}

// ----- native window actions (bound to JS) ------------------------------------

static webview::webview *g_w = nullptr;

static void do_action(const std::string &action) {
  HWND hwnd = g_hwnd;
  if (!hwnd) return;

  if (action == "minimize") {
    ShowWindow(hwnd, SW_MINIMIZE);
  } else if (action == "maximize") {
    ShowWindow(hwnd, IsZoomed(hwnd) ? SW_RESTORE : SW_MAXIMIZE);
  } else if (action == "restore") {
    ShowWindow(hwnd, SW_RESTORE);
  } else if (action == "drag") {
    // Begin a window drag from JS (used if HTCAPTION drag is not desired).
    ReleaseCapture();
    SendMessageW(hwnd, WM_NCLBUTTONDOWN, HTCAPTION, 0);
  } else if (action == "close") {
    PostMessageW(hwnd, WM_CLOSE, 0, 0);
  } else if (action.rfind("resize-", 0) == 0) {
    // Resize depuis JS : WebView2 recouvre les bordures, donc le WM_NCHITTEST
    // natif ne se declenche pas. Le bord CSS envoie resize-<dir> et on demarre
    // le redimensionnement natif via WM_NCLBUTTONDOWN avec le bon code HT.
    std::string dir = action.substr(7);
    WPARAM ht = 0;
    if (dir == "l")       ht = HTLEFT;
    else if (dir == "r")  ht = HTRIGHT;
    else if (dir == "t")  ht = HTTOP;
    else if (dir == "b")  ht = HTBOTTOM;
    else if (dir == "tl") ht = HTTOPLEFT;
    else if (dir == "tr") ht = HTTOPRIGHT;
    else if (dir == "bl") ht = HTBOTTOMLEFT;
    else if (dir == "br") ht = HTBOTTOMRIGHT;
    if (ht) {
      ReleaseCapture();
      SendMessageW(hwnd, WM_NCLBUTTONDOWN, ht, 0);
    }
  }
}

// Extract the first JSON string element from req, e.g. ["minimize"] -> minimize
static std::string first_json_string(const std::string &req) {
  size_t a = req.find('"');
  if (a == std::string::npos) return "";
  size_t b = req.find('"', a + 1);
  if (b == std::string::npos) return "";
  return req.substr(a + 1, b - a - 1);
}

// ----- argument parsing -------------------------------------------------------

static std::string arg_value(int argc, char **argv, const std::string &key,
                             const std::string &dflt) {
  std::string pfx = "--" + key + "=";
  for (int i = 1; i < argc; ++i) {
    std::string a = argv[i];
    if (a.rfind(pfx, 0) == 0) {
      return a.substr(pfx.size());
    }
  }
  return dflt;
}

static int arg_int(int argc, char **argv, const std::string &key, int dflt) {
  std::string v = arg_value(argc, argv, key, "");
  if (v.empty()) return dflt;
  return std::atoi(v.c_str());
}

int main(int argc, char **argv) {
  // Detach stdout/stderr to NUL. WebView2/Chromium writes log lines to stderr;
  // if those streams stay open, the Toba parent's runproc(cmd, null()) keeps
  // reading them and never returns control, freezing its BridgePoll loop.
  // With no output stream, runproc stays truly non-blocking.
  freopen("NUL", "w", stdout);
  freopen("NUL", "w", stderr);

  std::string htmlPath = arg_value(argc, argv, "html", "");
  std::string title    = arg_value(argc, argv, "title", "Toba WebUI");
  int width    = arg_int(argc, argv, "width", 1200);
  int height   = arg_int(argc, argv, "height", 800);
  int x        = arg_int(argc, argv, "x", -1);
  int y        = arg_int(argc, argv, "y", -1);
  int debug    = arg_int(argc, argv, "debug", 0);
  g_frameless  = arg_int(argc, argv, "frameless", 0);

  webview::webview w(debug != 0, nullptr);
  g_w = &w;
  w.set_title(title);
  w.set_size(width, height, WEBVIEW_HINT_NONE);

  g_hwnd = (HWND)w.window().value();

  // Bind native window actions. The HTML titlebar calls
  // window.webviewNativeAction(a) -> window.nativeWindowAction(a) -> here.
  w.bind("nativeWindowAction",
         [](const std::string &req) -> std::string {
           do_action(first_json_string(req));
           return "";
         });

  if (g_frameless) {
    apply_frameless(g_hwnd);
  }

  if (x >= 0 && y >= 0) {
    SetWindowPos(g_hwnd, nullptr, x, y, 0, 0,
                 SWP_NOSIZE | SWP_NOZORDER);
  }

  // Load the generated page. Prefer navigating to the file URL: it supports
  // arbitrarily large pages (gallery HTML can be > 1 MB) and keeps the
  // WebSocket bridge in the page working exactly as before.
  if (!htmlPath.empty()) {
    std::string url = "file:///" + htmlPath;
    for (char &c : url) {
      if (c == '\\') c = '/';
    }
    w.navigate(url);
  } else {
    w.set_html("<h1>Toba WebUI host: no --html provided</h1>");
  }

  w.run();
  return 0;
}
