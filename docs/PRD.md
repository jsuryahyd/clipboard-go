# Product Requirements Document (PRD): Clipboard-Go

## 1. Overview
Clipboard-Go is a high-performance, hybrid clipboard manager for Linux. It combines a **headless GNOME Shell Extension** (handling unprivileged Wayland interactions) with a **standalone Go/Wails Application** (handling UI, database, and background processing). This architecture achieves the best of both worlds: perfect OS integration without freezing the desktop environment.

## 2. Target Audience
Linux power users, developers, and professionals who require a reliable clipboard history manager with premium aesthetics and flawless Wayland support, without the system freezes associated with traditional GNOME extensions.

## 3. Hybrid Architecture Concept
- **Headless GNOME Extension (The Bridge)**: A minimalist extension that runs directly inside GNOME Shell. It does no heavy processing, rendering, or database querying. Its only jobs are to listen for clipboard changes, broadcast them via DBus, and accept DBus commands to inject/auto-paste content into active windows. This cleanly bypasses Wayland's strict security protocols.
- **Wails Application (The Core)**: A standalone Go process that listens to the DBus events, manages the asynchronous SQLite database, handles history logic, and renders the premium WebKitGTK user interface.

## 4. Core Features
- **Multi-Format Support**: Capture text, code, images, file URIs, and links.
- **Persistent History**: Backed by a fast, asynchronous SQLite database managed by Go.
- **Organization**: Pin favorite items and categorize them using tags.
- **Fast Search**: Instant, asynchronous search through clipboard history.
- **Auto-Paste**: Automatically paste the selected item into the previously active window, reliably executed by the GNOME extension.
- **Global Hotkeys**: Bring up the clipboard manager instantly via a customizable shortcut (e.g., `Super+Shift+V`).
- **Incognito Mode**: Temporarily pause clipboard recording (e.g., for password managers).

## 5. Operational & Data Retention Policies
To ensure long-term stability and prevent disk bloat, the application will enforce strict operational limits:
- **Retention Period**: Unpinned items are stored for 30 days by default (configurable).
- **Size Limits**: 
  - Maximum image/file size per copied item: 10MB (larger items are ignored or stored as file paths only).
  - Maximum SQLite database size warning: 500MB.
- **Scheduled Cleanup**: A background Go routine runs on startup and periodically (e.g., every 24 hours) to purge expired items and vacuum the SQLite database to reclaim disk space.

## 6. System Integration & Observability
- **Startup App**: The application automatically creates a `.desktop` file in `~/.config/autostart/` so the Wails daemon starts silently in the background upon user login.
- **System Tray**: A persistent system tray icon (utilizing AppIndicator/libayatana bindings provided by Wails) allows quick access to settings, incognito toggle, clear history, and manual quitting.
- **Diagnostics & Logging**: Comprehensive debug and error logging implemented using a structured logger (e.g., `rs/zerolog` + `lumberjack`). Logs are rotated and persistently stored in `~/.local/state/clipboard-go/app.log` for easy troubleshooting and user bug reports.

## 7. Key Linux Pitfalls Avoided (Derived from Copyous)
1. **Desktop Environment Freezes**: *Solved*. The GNOME Extension does zero data processing. All SQLite/UI tasks are offloaded to Wails.
2. **Wayland Auto-Paste & Focus Failures**: *Solved*. The headless GNOME Extension executes the paste command from inside the compositor with absolute authority.
3. **High Memory and dGPU Wake-up**: *Solved*. Eager loading is handled by Go and WebKitGTK, preventing dGPU wake-ups caused by heavy GJS processes.
4. **Slow Initial Load**: *Solved*. Virtualization on the frontend and asynchronous DB queries ensure instant rendering.

## 8. Non-Functional Requirements
- **Performance**: The UI must render under 50ms upon hotkey press.
- **Memory**: Background memory usage should stay under 50MB for the Wails daemon. The GNOME Extension should consume <5MB.
- **Architecture**: DBus for inter-process communication between the extension and the daemon.
