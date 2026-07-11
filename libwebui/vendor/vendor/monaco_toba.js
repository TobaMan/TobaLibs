(function () {
  if (window.lwMonacoBoot) return;
  window.lwMonacoBoot = 1;
  window.lwMonacoEditors = {};

  function webuiThemeBase() {
    var t = document.body.getAttribute("data-theme") || "";
    return t.indexOf("dark") >= 0 ? "vs-dark" : "vs";
  }

  function cssVar(name, fallback) {
    var value = (getComputedStyle(document.body).getPropertyValue(name) || fallback).trim();
    return value || fallback;
  }

  function hex(name, fallback) {
    return cssVar(name, fallback).replace("#", "");
  }

  function registerTobaLanguage() {
    if (!window.monaco || !monaco.languages || window.lwTobaLangReady) return;
    window.lwTobaLangReady = 1;

    monaco.languages.register({
      id: "toba",
      extensions: [".to", ".toba"],
      aliases: ["Toba", "toba", "to"]
    });

    monaco.languages.setLanguageConfiguration("toba", {
      comments: { lineComment: "//", blockComment: ["/*", "*/"] },
      brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "\"", close: "\"" },
        { open: "'", close: "'" }
      ]
    });

    monaco.languages.setMonarchTokensProvider("toba", {
      defaultToken: "",
      tokenizer: {
        root: [
          [/\/\/.*$/, "comment"],
          [/\/\*/, "comment", "@comment"],
          [/@/, "comment", "@atcomment"],
          [/\b(func|obj|enum|import)\b/, "keyword.declaration"],
          [/\b(if|else|for|foreach|loop|break|continue|return)\b/, "keyword.control"],
          [/\bself\b/, "variable.language"],
          [/\b(abs|archive|arglist|array|build|ceil|clock|concat|cos|equal|exit|exp|find|floor|frombyte|garbage|input|insert|inside|log|main|max|min|null|platform|pow|print|rand|remove|replace|reverse|runproc)\b(?=\s*\()/, "support.function"],
          [/\b(sin|size|sizeof|sleep|slice|sort|split|sqrt|str|strnum|system|tan|tobyte|trunc|version|dtime|freplace|numstr|num|isnum|isstr|ismap|isobj|isinst|isfunc|isenum|isarch)\b(?=\s*\()/, "support.function"],
          [/\b(fsreadf|fsreadd|fswritef|fswrited|fsrename|fsremove|fstype|fspath|dlopen|dlclose|dlcall|dlstdcall|dlcdecl|ctoptr|cfromptr|cfreeptr|cuchar|cchar|cushort|cshort|cuint|cint|culong|clong|cfloat|cdouble|cstring|cstruct|cpointer)\b(?=\s*\()/, "support.function"],
          [/\b[a-zA-Z_]\w*(?=\s*\()/, "entity.name.function"],
          [/\b[a-zA-Z_]\w*\b/, "identifier"],
          [/0[xX][0-9a-fA-F]+/, "number.hex"],
          [/\d+(\.\d+)?[eE][\-+]?\d+/, "number.float"],
          [/\d+\.\d+/, "number.float"],
          [/\d+/, "number"],
          [/::|==|!=|<=|>=|<>|<<|>>|&&|\|\||[$=+\-*\/%<>!&|^~.:,;]/, "operator"],
          [/"/, "string", "@dstring"],
          [/'/, "string", "@sstring"]
        ],
        comment: [
          [/[^*@]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*@]/, "comment"]
        ],
        atcomment: [
          [/@/, "comment", "@pop"],
          [/[^@]+/, "comment"]
        ],
        dstring: [
          [/[^\\"]+/, "string"],
          [/\\[tnrbf'"\\]/, "string.escape"],
          [/"/, "string", "@pop"]
        ],
        sstring: [
          [/[^\\']+/, "string"],
          [/\\[tnrbf'"\\]/, "string.escape"],
          [/'/, "string", "@pop"]
        ]
      }
    });
  }

  function applyTheme() {
    if (!window.monaco || !monaco.editor) return;
    var dark = webuiThemeBase() === "vs-dark";
    try {
      monaco.editor.defineTheme("lw-webui", {
        base: dark ? "vs-dark" : "vs",
        inherit: true,
        rules: [
          { token: "keyword.control", foreground: hex("--accent", "#0c9c7e"), fontStyle: "bold" },
          { token: "keyword.declaration", foreground: "d64f8c", fontStyle: "bold" },
          { token: "variable.language", foreground: "ff8b3d", fontStyle: "bold" },
          { token: "support.function", foreground: hex("--user", "#3563e9"), fontStyle: "bold" },
          { token: "entity.name.function", foreground: hex("--text-1", "#1c2b3f"), fontStyle: "bold" },
          { token: "identifier", foreground: hex("--text-1", "#1c2b3f") },
          { token: "operator", foreground: hex("--text-2", "#4d617b"), fontStyle: "bold" },
          { token: "string", foreground: "0c9c7e" },
          { token: "string.escape", foreground: "ffaa33" },
          { token: "number", foreground: "9b7cff" },
          { token: "comment", foreground: hex("--text-3", "#7c8fa6"), fontStyle: "italic" }
        ],
        colors: {
          "editor.background": cssVar("--bg-card", dark ? "#11111c" : "#ffffff"),
          "editor.foreground": cssVar("--text-1", dark ? "#e4e4f0" : "#1c2b3f"),
          "editorLineNumber.foreground": cssVar("--text-3", "#7c8fa6"),
          "editorLineNumber.activeForeground": cssVar("--accent", "#0c9c7e"),
          "editorCursor.foreground": cssVar("--accent", "#0c9c7e"),
          "editor.selectionBackground": dark ? "#264f78" : "#add6ff",
          "editor.inactiveSelectionBackground": dark ? "#3a3d41" : "#e5ebf1",
          "editor.lineHighlightBackground": cssVar("--bg-hover", dark ? "#191930" : "#eef3fb"),
          "editorGutter.background": cssVar("--bg-card", dark ? "#11111c" : "#ffffff"),
          "editorWidget.background": cssVar("--bg-card", dark ? "#11111c" : "#ffffff"),
          "editorWidget.border": cssVar("--border", "#d8e1ef")
        }
      });
      monaco.editor.setTheme("lw-webui");
    } catch (e) {
      monaco.editor.setTheme(webuiThemeBase());
    }
  }

  function emit(root, value, source) {
    webuiEvent(root.getAttribute("data-event") || "monaco_change", {
      id: root.id,
      value: value,
      language: root.getAttribute("data-lang") || "plaintext",
      source: source
    });
  }

  window.lwMonacoInitOne = function (root) {
    if (!root || root.getAttribute("data-ready")) return;
    var id = root.id;
    var ta = root.querySelector("textarea");
    var host = root.querySelector(".lw-monaco-host");
    var status = root.querySelector(".lw-monaco-status");
    var lang = root.getAttribute("data-lang") || "plaintext";
    if (lang === "to") lang = "toba";
    var readOnly = root.getAttribute("data-readonly") === "1";

    if (window.monaco && host) {
      registerTobaLanguage();
      applyTheme();
      root.setAttribute("data-ready", "monaco");
      if (status) status.textContent = "Monaco";
      var editor = monaco.editor.create(host, {
        value: ta ? ta.value : "",
        language: lang,
        theme: "lw-webui",
        automaticLayout: true,
        minimap: { enabled: false },
        readOnly: readOnly,
        fontSize: 13,
        scrollBeyondLastLine: false
      });
      window.lwMonacoEditors[id] = editor;
      editor.onDidChangeModelContent(function () {
        var value = editor.getValue();
        if (ta) ta.value = value;
        clearTimeout(root.__lwMonacoT);
        root.__lwMonacoT = setTimeout(function () {
          emit(root, value, "monaco");
        }, 220);
      });
      return;
    }

    root.setAttribute("data-ready", "textarea");
    if (status) status.textContent = "Textarea";
    if (ta) {
      ta.oninput = function () {
        emit(root, ta.value, "textarea");
      };
    }
  };

  window.lwMonacoInit = function () {
    var widgets = document.querySelectorAll(".lw-monaco-widget");
    for (var i = 0; i < widgets.length; i++) window.lwMonacoInitOne(widgets[i]);
  };

  window.lwMonacoFormat = function (id) {
    var editor = window.lwMonacoEditors[id];
    if (editor) {
      editor.getAction("editor.action.formatDocument").run();
      webuiEvent("monaco_format", { id: id, value: editor.getValue(), source: "monaco" });
      return;
    }
    var root = document.getElementById(id);
    var ta = root ? root.querySelector("textarea") : null;
    if (ta) webuiEvent("monaco_format", { id: id, value: ta.value, source: "textarea" });
  };

  window.lwMonacoCopy = function (id) {
    var editor = window.lwMonacoEditors[id];
    var value = editor ? editor.getValue() : "";
    var root = document.getElementById(id);
    var ta = root ? root.querySelector("textarea") : null;
    if (!editor && ta) value = ta.value;
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    webuiEvent("monaco_copy", { id: id, value: value });
  };

  function loadMonaco(loaderUrl) {
    if (window.monaco) {
      window.lwMonacoInit();
      return;
    }
    if (document.querySelector("script[data-lw-monaco-loader]")) return;
    var script = document.createElement("script");
    script.src = loaderUrl;
    script.setAttribute("data-lw-monaco-loader", "1");
    script.onload = function () {
      try {
        var base = loaderUrl;
        var pos = base.indexOf("/vs/loader");
        if (pos >= 0) base = base.slice(0, pos) + "/vs";
        require.config({ paths: { vs: base } });
        require(["vs/editor/editor.main"], window.lwMonacoInit);
      } catch (e) {
        window.lwMonacoInit();
      }
    };
    script.onerror = window.lwMonacoInit;
    document.head.appendChild(script);
    setTimeout(window.lwMonacoInit, 1200);
    setTimeout(window.lwMonacoInit, 3200);
  }

  function start() {
    var first = document.querySelector(".lw-monaco-widget");
    var loaderUrl = first ? first.getAttribute("data-loader-url") : "";
    loadMonaco(loaderUrl || window.lwMonacoDefaultLoader || "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js");
    try {
      new MutationObserver(function () {
        if (window.monaco) {
          applyTheme();
          for (var id in window.lwMonacoEditors) {
            if (window.lwMonacoEditors[id]) window.lwMonacoEditors[id].layout();
          }
        }
      }).observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    } catch (e) {}
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else setTimeout(start, 0);
})();
