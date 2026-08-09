# Implementation Plan: Clipboard-Go (Hybrid Architecture)

## Testing & Validation Strategy
To validate our hybrid architecture assumptions early, we will test the GNOME Extension independently at the end of **Phase 1**, before any UI or Database code is written.
- **Inbound Validation (Copying)**: We will use the `gdbus monitor` CLI command in a terminal to verify that copying text/images in Wayland successfully emits DBus signals from the extension.
- **Outbound Validation (Auto-Pasting)**: We will use `gdbus call` from a terminal to mock the Wails backend, sending a simulated paste command to the extension. If the extension successfully injects the text into the active window (e.g., a text editor), the core architectural risk is mitigated.

## Phase 1: Headless GNOME Extension (The Bridge)
1. **Extension Setup**: Create a minimal GNOME Extension structure (`metadata.json`, `extension.js`, `prefs.js`).
2. **DBus Interface**: Expose a session DBus service (e.g., `org.gnome.Shell.Extensions.ClipboardGo`).
3. **Clipboard Monitoring**: Hook into GNOME's `St.Clipboard` to listen for text and image changes. Emit a DBus signal (`ClipboardChanged(type, data)`) whenever a copy occurs.
4. **Auto-Paste Implementation**: Create a DBus method (`InjectPaste(type, data)`) that programmatically sets the clipboard content and triggers a paste action (via Clutter/Virtual keyboard events) directly into the active window.
5. **Hotkey Registration**: Register the global shortcut (`Super+Shift+V`) inside the extension, which emits a DBus signal (`ShowUI`) to wake the Wails app.

## Phase 2: Wails Core, Database & Logging
1. **Initialize Project**: Scaffold the Wails project using a lightweight template (`wails init -n clipboard-go -t vanilla-ts`).
2. **Logging Infrastructure**: Integrate a rotating structured logger (e.g., `lumberjack` + `zerolog`) writing to `~/.local/state/clipboard-go/app.log` for comprehensive debug and error tracing.
3. **Database Setup**: Integrate a lightweight SQLite driver (e.g., `modernc.org/sqlite`). Implement schema for `ClipboardItems` and `Tags`.
4. **Data Retention & Cleanup**: Create a background goroutine that runs on launch and periodically to:
   - Delete items older than the 30-day retention limit.
   - Reject clipboard items larger than 10MB to protect database size.
   - Run `VACUUM` on the database to reclaim space.
5. **DBus Client**: Use the `godbus/dbus` Go library to connect to the session bus, listen to `ClipboardChanged`, store data in SQLite, and listen to `ShowUI`.

## Phase 3: Window Management & OS Integration
1. **Autostart Registration**: Implement Go logic to programmatically write a `clipboard-go.desktop` file to `~/.config/autostart/`, ensuring the Wails daemon boots silently on user login.
2. **System Tray Integration**: Utilize Wails' application menu (which binds to AppIndicator/libayatana on Linux) to render the tray icon with basic controls (Quit, Settings, Clear History, Incognito).
3. **Window Summoning**: Configure the Wails application window to be frameless, hide on blur, and spawn exactly at the mouse pointer's coordinates upon receiving the `ShowUI` signal.

## Phase 4: Frontend UI & Virtualization
1. **UI Architecture**: Build a highly responsive, searchable list for the clipboard history using Vanilla CSS. 
2. **Virtualization**: Implement a virtualized list (windowing) to ensure the DOM remains lightweight even with thousands of items.
3. **Visual Polish**: Implement modern design aesthetics (glassmorphism, tailored dark mode, smooth micro-animations).

## Phase 5: The Auto-Paste Integration
1. **Execution Flow**: When a user selects an item in the Wails UI, the Go backend calls the GNOME Extension's `InjectPaste` DBus method.
2. **Focus Handoff**: The Wails app hides itself immediately, allowing GNOME Shell to yield focus back to the previously active application before the extension simulates the paste.
3. **State Syncing**: Ensure the Go backend doesn't re-record the item we just injected into the clipboard as a "new" copy event.

## Phase 6: Packaging & Deployment
1. **Resource Management**: Tune Go garbage collection and Wails build flags to minimize binary size and memory footprint.
2. **Build Automation**: Create a Makefile that packages the GNOME Extension into a deployable `.zip`, compiles the Wails binary, and bundles the `.desktop` configurations.
