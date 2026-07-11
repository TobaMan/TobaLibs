# Toba WebUI native window bridge

This bridge keeps native window operations outside the generic WebSocket event
bridge. It is intentionally small:

- `toba_window_set_frameless(title, enabled)`
- `toba_window_action(title, action)`
- `toba_window_find(title)`
- `toba_window_platform()`

Supported Windows actions: `minimize`, `maximize`, `restore`, `close`, `front`,
`drag`.

Windows is implemented with Win32. Linux and macOS currently expose the same ABI
and return unsupported until a concrete WebUI backend handle is available.
