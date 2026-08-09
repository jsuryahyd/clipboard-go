# Project Todos

## Core Tasks
- [x] Create settings modal (needs dedicated settings UI)
- [x] Fix clear history alert dialog (replaced `window.confirm` with custom modal)

## System Tray Icon (Linux)
- [ ] Implement System Tray Icon
  - **Technical Details**: Wails v2 does not natively support system tray components on Linux (only macOS and Windows natively). To build a tray icon, we would have to integrate `github.com/getlantern/systray` or `github.com/energye/systray`. This relies on C-bindings for `libappindicator3-dev`/`libgtk-3-dev`.
  - **Why deferred**: It requires installing C-dependencies on the host system, compiling with CGO enabled (which can cause issues with Wayland), and managing a blocking C-thread alongside the Wails UI thread. It is a "nice to have" but not critical for the core functionality, although without it there's no visual indicator that the background daemon is running.

## Bugs
- [ ] Images copied to clipboard are not displaying in the UI. GNOME shell's `St.Clipboard.get_text()` does not read image data. The extension logic needs to handle mimetypes like `image/png` properly.
