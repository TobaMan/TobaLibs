#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#if defined(_WIN32)
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <windowsx.h>

#define TOBA_EXPORT __declspec(dllexport)

typedef struct TobaFindWindowCtx {
    const char* title;
    HWND hwnd;
} TobaFindWindowCtx;

typedef struct TobaApplyWindowCtx {
    const char* title;
    DWORD pid;
    int enabled;
    int count;
    HWND first;
    int best_area;
} TobaApplyWindowCtx;

static HWND g_toba_last_hwnd = NULL;
static int g_toba_last_action_result = 0;
static int g_toba_action_count = 0;
static const char* TOBA_ORIG_PROC_PROP = "TobaWindowBridgeOrigProc";
static const char* TOBA_CHILD_PROC_PROP = "TobaWindowBridgeChildProc";
static const char* TOBA_ALLOW_CLOSE_PROP = "TobaWindowBridgeAllowClose";

static LRESULT CALLBACK toba_window_proc(HWND hwnd, UINT msg, WPARAM wparam, LPARAM lparam) {
    WNDPROC old_proc = (WNDPROC)GetPropA(hwnd, TOBA_ORIG_PROC_PROP);

    if (msg == WM_CLOSE) {
        if (!GetPropA(hwnd, TOBA_ALLOW_CLOSE_PROP)) {
            return 0;
        }
    }

    if (msg == WM_SYSCOMMAND) {
        if ((wparam & 0xFFF0) == SC_CLOSE) {
            if (!GetPropA(hwnd, TOBA_ALLOW_CLOSE_PROP)) {
                return 0;
            }
        }
    }

    if (msg == WM_NCHITTEST) {
        RECT rect;
        POINT pt;
        LRESULT hit = HTCLIENT;
        if (old_proc) {
            hit = CallWindowProcA(old_proc, hwnd, msg, wparam, lparam);
        }
        if (hit != HTCLIENT) {
            return hit;
        }
        pt.x = GET_X_LPARAM(lparam);
        pt.y = GET_Y_LPARAM(lparam);
        if (GetWindowRect(hwnd, &rect)) {
            int border = 7;
            int title_height = 34;
            if (pt.y >= rect.top && pt.y < rect.top + border) {
                return HTTOP;
            }
            if (pt.y <= rect.bottom && pt.y > rect.bottom - border) {
                return HTBOTTOM;
            }
            if (pt.x >= rect.left && pt.x < rect.left + border) {
                return HTLEFT;
            }
            if (pt.x <= rect.right && pt.x > rect.right - border) {
                return HTRIGHT;
            }
            if (pt.y >= rect.top && pt.y < rect.top + title_height) {
                if (pt.x < rect.right - 150) {
                    return HTCLIENT;
                }
            }
        }
        return hit;
    }

    if (old_proc) {
        return CallWindowProcA(old_proc, hwnd, msg, wparam, lparam);
    }
    return DefWindowProcA(hwnd, msg, wparam, lparam);
}

static void toba_enable_subclass_one(HWND hwnd, int enabled, int is_child) {
    WNDPROC old_proc;

    if (!hwnd) {
        return;
    }

    old_proc = (WNDPROC)GetPropA(hwnd, TOBA_ORIG_PROC_PROP);
    if (enabled) {
        if (!old_proc) {
            old_proc = (WNDPROC)GetWindowLongPtrA(hwnd, GWLP_WNDPROC);
            SetPropA(hwnd, TOBA_ORIG_PROC_PROP, (HANDLE)old_proc);
            if (is_child) {
                SetPropA(hwnd, TOBA_CHILD_PROC_PROP, (HANDLE)1);
            }
            SetWindowLongPtrA(hwnd, GWLP_WNDPROC, (LONG_PTR)toba_window_proc);
        }
    } else {
        if (old_proc) {
            SetWindowLongPtrA(hwnd, GWLP_WNDPROC, (LONG_PTR)old_proc);
            RemovePropA(hwnd, TOBA_ORIG_PROC_PROP);
        }
        RemovePropA(hwnd, TOBA_CHILD_PROC_PROP);
        RemovePropA(hwnd, TOBA_ALLOW_CLOSE_PROP);
    }
}

static void toba_enable_subclass(HWND hwnd, int enabled) {
    toba_enable_subclass_one(hwnd, enabled, 0);
}

static int toba_apply_frameless(HWND hwnd, int enabled) {
    LONG_PTR style;
    LONG_PTR exstyle;

    if (!hwnd) {
        return 0;
    }

    style = GetWindowLongPtrA(hwnd, GWL_STYLE);
    exstyle = GetWindowLongPtrA(hwnd, GWL_EXSTYLE);
    if (enabled) {
        style &= ~(WS_OVERLAPPEDWINDOW | WS_CAPTION | WS_SYSMENU | WS_THICKFRAME |
                   WS_MINIMIZEBOX | WS_MAXIMIZEBOX);
        style |= WS_POPUP | WS_CLIPCHILDREN | WS_CLIPSIBLINGS;
        exstyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
    } else {
        style &= ~WS_POPUP;
        style |= WS_OVERLAPPEDWINDOW;
    }
    SetWindowLongPtrA(hwnd, GWL_STYLE, style);
    SetWindowLongPtrA(hwnd, GWL_EXSTYLE, exstyle);
    if (enabled) {
        g_toba_last_hwnd = hwnd;
    } else if (g_toba_last_hwnd == hwnd) {
        g_toba_last_hwnd = NULL;
    }
    toba_enable_subclass(hwnd, enabled);
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
        SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOOWNERZORDER |
        SWP_FRAMECHANGED | SWP_SHOWWINDOW);
    RedrawWindow(hwnd, NULL, NULL, RDW_INVALIDATE | RDW_FRAME | RDW_UPDATENOW);
    return 1;
}

static int toba_str_contains_ci(const char* haystack, const char* needle) {
    size_t hlen;
    size_t nlen;
    size_t i;
    size_t j;

    if (!haystack || !needle || !needle[0]) {
        return 0;
    }

    hlen = strlen(haystack);
    nlen = strlen(needle);
    if (nlen > hlen) {
        return 0;
    }

    for (i = 0; i <= hlen - nlen; ++i) {
        for (j = 0; j < nlen; ++j) {
            char a = haystack[i + j];
            char b = needle[j];
            if (a >= 'A' && a <= 'Z') {
                a = (char)(a + 32);
            }
            if (b >= 'A' && b <= 'Z') {
                b = (char)(b + 32);
            }
            if (a != b) {
                break;
            }
        }
        if (j == nlen) {
            return 1;
        }
    }
    return 0;
}

static BOOL CALLBACK toba_enum_windows_proc(HWND hwnd, LPARAM lparam) {
    TobaFindWindowCtx* ctx = (TobaFindWindowCtx*)lparam;
    char title[512];

    if (!IsWindowVisible(hwnd)) {
        return TRUE;
    }

    title[0] = 0;
    GetWindowTextA(hwnd, title, (int)sizeof(title));
    if (title[0] && toba_str_contains_ci(title, ctx->title)) {
        ctx->hwnd = hwnd;
        return FALSE;
    }

    return TRUE;
}

static HWND toba_find_window(const char* title) {
    TobaFindWindowCtx ctx;
    ctx.title = title;
    ctx.hwnd = NULL;

    if (!title || !title[0]) {
        return GetForegroundWindow();
    }

    EnumWindows(toba_enum_windows_proc, (LPARAM)&ctx);
    if (ctx.hwnd) {
        return ctx.hwnd;
    }
    return GetForegroundWindow();
}

static BOOL CALLBACK toba_apply_windows_proc(HWND hwnd, LPARAM lparam) {
    TobaApplyWindowCtx* ctx = (TobaApplyWindowCtx*)lparam;
    DWORD pid = 0;
    char title[512];
    int match = 0;

    if (!IsWindowVisible(hwnd)) {
        return TRUE;
    }

    GetWindowThreadProcessId(hwnd, &pid);
    if (ctx->pid != 0 && pid == ctx->pid) {
        match = 1;
    }

    title[0] = 0;
    GetWindowTextA(hwnd, title, (int)sizeof(title));
    if (!match && title[0] && ctx->title && ctx->title[0] && toba_str_contains_ci(title, ctx->title)) {
        match = 1;
    }

    if (match) {
        if (toba_apply_frameless(hwnd, ctx->enabled)) {
            RECT rect;
            int area = 0;
            ctx->count += 1;
            if (!ctx->first) {
                ctx->first = hwnd;
            }
            if (GetWindowRect(hwnd, &rect)) {
                area = (rect.right - rect.left) * (rect.bottom - rect.top);
            }
            if (area > ctx->best_area) {
                ctx->best_area = area;
                ctx->first = hwnd;
            }
        }
    }

    return TRUE;
}

TOBA_EXPORT uintptr_t toba_window_find(const char* title) {
    return (uintptr_t)toba_find_window(title);
}

TOBA_EXPORT int toba_window_set_frameless(const char* title, int enabled) {
    TobaApplyWindowCtx ctx;
    HWND hwnd;

    ctx.title = title;
    ctx.pid = GetCurrentProcessId();
    ctx.enabled = enabled;
    ctx.count = 0;
    ctx.first = NULL;
    ctx.best_area = 0;

    EnumWindows(toba_apply_windows_proc, (LPARAM)&ctx);
    if (ctx.count > 0) {
        return 1;
    }

    hwnd = toba_find_window(title);
    return toba_apply_frameless(hwnd, enabled);
}

TOBA_EXPORT uintptr_t toba_window_apply_frameless(const char* title, int enabled) {
    TobaApplyWindowCtx ctx;
    HWND hwnd;

    ctx.title = title;
    ctx.pid = GetCurrentProcessId();
    ctx.enabled = enabled;
    ctx.count = 0;
    ctx.first = NULL;
    ctx.best_area = 0;

    EnumWindows(toba_apply_windows_proc, (LPARAM)&ctx);
    if (ctx.first) {
        return (uintptr_t)ctx.first;
    }

    hwnd = toba_find_window(title);
    if (toba_apply_frameless(hwnd, enabled)) {
        return (uintptr_t)hwnd;
    }
    return 0;
}

static int toba_window_action_hwnd(HWND hwnd, const char* action) {
    if (!hwnd || !action) {
        return 0;
    }

    if (strcmp(action, "minimize") == 0) {
        ShowWindow(hwnd, SW_MINIMIZE);
        return 1;
    }
    if (strcmp(action, "maximize") == 0) {
        ShowWindow(hwnd, IsZoomed(hwnd) ? SW_RESTORE : SW_MAXIMIZE);
        return 1;
    }
    if (strcmp(action, "restore") == 0) {
        ShowWindow(hwnd, SW_RESTORE);
        return 1;
    }
    if (strcmp(action, "close") == 0) {
        SetPropA(hwnd, TOBA_ALLOW_CLOSE_PROP, (HANDLE)1);
        PostMessageA(hwnd, WM_CLOSE, 0, 0);
        return 1;
    }
    if (strcmp(action, "force_close") == 0) {
        SetPropA(hwnd, TOBA_ALLOW_CLOSE_PROP, (HANDLE)1);
        PostMessageA(hwnd, WM_CLOSE, 0, 0);
        return 1;
    }
    if (strcmp(action, "front") == 0) {
        SetForegroundWindow(hwnd);
        return 1;
    }
    if (strcmp(action, "drag") == 0) {
        SetForegroundWindow(hwnd);
        return 1;
    }

    return 0;
}

TOBA_EXPORT int toba_window_action_handle(uintptr_t handle, const char* action) {
    g_toba_action_count += 1;
    g_toba_last_action_result = toba_window_action_hwnd((HWND)handle, action);
    return g_toba_last_action_result;
}

TOBA_EXPORT int toba_window_action(const char* title, const char* action) {
    HWND hwnd = g_toba_last_hwnd;

    if (!hwnd || !action) {
        hwnd = toba_find_window(title);
    }

    g_toba_action_count += 1;
    g_toba_last_action_result = toba_window_action_hwnd(hwnd, action);
    return g_toba_last_action_result;
}

TOBA_EXPORT uintptr_t toba_window_last_handle(void) {
    return (uintptr_t)g_toba_last_hwnd;
}

TOBA_EXPORT int toba_window_last_action_result(void) {
    return g_toba_last_action_result;
}

TOBA_EXPORT int toba_window_action_count(void) {
    return g_toba_action_count;
}

TOBA_EXPORT int toba_window_platform(void) {
    return 1;
}

// Launch a command fully detached and return immediately (non-blocking).
// Unlike Toba's runproc, this does NOT create stdout/stderr pipes, so it does
// not wait on the child's output stream — the GUI host can keep running while
// Toba continues its BridgePoll loop. Returns 1 on success, 0 on failure.
TOBA_EXPORT int toba_run_detached(const char* cmd) {
    STARTUPINFOA si;
    PROCESS_INFORMATION pi;
    char* buf;
    size_t len;
    BOOL ok;

    if (!cmd || !cmd[0]) {
        return 0;
    }

    ZeroMemory(&si, sizeof(si));
    si.cb = sizeof(si);
    ZeroMemory(&pi, sizeof(pi));

    // CreateProcessA may modify the command buffer, so copy it.
    len = strlen(cmd);
    buf = (char*)malloc(len + 1);
    if (!buf) {
        return 0;
    }
    memcpy(buf, cmd, len + 1);

    ok = CreateProcessA(
        NULL,
        buf,
        NULL,
        NULL,
        FALSE,                                   // do not inherit handles
        DETACHED_PROCESS | CREATE_NO_WINDOW,     // no console, no pipes
        NULL,
        NULL,
        &si,
        &pi);

    free(buf);

    if (!ok) {
        return 0;
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return 1;
}

#else

#define TOBA_EXPORT __attribute__((visibility("default")))

TOBA_EXPORT uintptr_t toba_window_find(const char* title) {
    (void)title;
    return 0;
}

TOBA_EXPORT int toba_window_set_frameless(const char* title, int enabled) {
    (void)title;
    (void)enabled;
    return 0;
}

TOBA_EXPORT int toba_window_action(const char* title, const char* action) {
    (void)title;
    (void)action;
    return 0;
}

TOBA_EXPORT int toba_window_platform(void) {
#if defined(__APPLE__)
    return 3;
#elif defined(__linux__)
    return 2;
#else
    return 0;
#endif
}

TOBA_EXPORT int toba_run_detached(const char* cmd) {
    (void)cmd;
    return 0;
}

#endif
