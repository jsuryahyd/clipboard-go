# Clipboard-Go Troubleshooting & Known Gotchas

This document outlines several operating system and GNOME-specific issues encountered during the development of Clipboard-Go. These are edge-cases and security restrictions that are often undocumented or non-obvious, even for experienced desktop developers.

## 1. Wayland Security & Synthetic Input (The "Log-Out Crash")

**Issue:** Calling `Clutter.Event.new_key(...)` or `seat.handle_event(...)` from within a GNOME Extension to simulate keystrokes (like `Ctrl+V`) causes GNOME Shell to immediately crash (Segmentation Fault). Under Wayland, this crash kills the compositor and instantly logs the user out.
**Why:** Modern Wayland completely blocks synthetic input events originating from extensions or random processes for security reasons. Attempting to allocate and inject opaque C-level Clutter events from GJS is highly unstable in GNOME 45+.
**Solution:** Do not use `Clutter` to inject keystrokes in Wayland. Instead, use the DBus interface to simply set the clipboard content. The Go application should rely on external, Wayland-compatible tools (like `wtype`) or X11 tools (`xdotool`) to simulate the `Ctrl+V` keystroke if auto-pasting is strictly required.

## 2. DBus Service Naming for GNOME Extensions

**Issue:** DBus clients (like our Wails Go backend) throw `The name org.gnome.Shell.Extensions.ClipboardGo was not provided by any .service files` when attempting to call the extension's DBus methods.
**Why:** GNOME Extensions run *inside* the GNOME Shell process. When an extension exports a DBus object via `Gio.DBusExportedObject.export()`, it does **not** take ownership of a well-known bus name (like `org.gnome.Shell.Extensions.ClipboardGo`). Instead, it is exported under GNOME Shell's existing bus name.
**Solution:** The DBus client must send calls to the destination service `"org.gnome.Shell"`, but target the specific object path (e.g., `/org/gnome/Shell/Extensions/ClipboardGo`).

## 3. Global Hotkeys & GSettings Schemas

**Issue:** Registering a global hotkey via `Main.wm.addKeybinding` fails synchronously, and the extension refuses to enable.
**Why:** The extension attempts to register the hotkey against the default `org.gnome.shell.keybindings` schema. If your custom hotkey key (e.g., `toggle-clipboard-go`) does not exist in that schema natively, GNOME throws a fatal GSettings error.
**Solution:** The extension must ship with its own compiled GSettings schema (`schemas/org.gnome.shell.extensions.clipboard-go.gschema.xml`). 
*Note:* You must compile it using `glib-compile-schemas schemas/`. In modern ES modules for GNOME 45+, use `this.getSettings('your.schema.id')` to load it.

## 4. Extension Updates Require a Shell Restart

**Issue:** You update the GNOME Extension code or GSettings schema, but the changes (like a new hotkey mapping) do not take effect, even after disabling/enabling the extension.
**Why:** GNOME extensions are deeply embedded in the OS memory. Schema changes, in particular, are cached heavily.
**Solution:** 
- **X11:** Press `Alt+F2`, type `r`, and press `Enter` to restart GNOME Shell.
- **Wayland:** You cannot seamlessly restart the shell. You must save your work, log out, and log back in.

## 5. UI Window Disappears on "Copy/Paste" Click

**Issue:** Clicking an item in the Wails history grid causes the window to immediately disappear.
**Why:** This is intended behavior, but can look like a crash if the subsequent DBus paste fails. To inject a paste (`Ctrl+V`) into a target application (like a terminal or browser), the Clipboard-Go window must yield keyboard focus *before* the paste is simulated.
**Solution:** `runtime.WindowHide(ctx)` is called immediately on click. Ensure the DBus `InjectPaste` call and the `wtype`/`xdotool` execution happen *after* the window is hidden.

## 6. Wails CLI "Command Not Found"

**Issue:** Running `wails dev` returns `wails: command not found`.
**Why:** The Go `bin` directory is not in the system's `$PATH` variable by default on many Linux distributions.
**Solution:** Run the binary directly via `~/go/bin/wails dev` or add `export PATH=$PATH:~/go/bin` to your `~/.bashrc` or `~/.zshrc`.
