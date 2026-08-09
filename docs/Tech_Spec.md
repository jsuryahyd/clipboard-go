# Technical Specification: Clipboard-Gnome

This document provides the exact technical constraints, interface contracts, and architectural skeletons required to implement the Clipboard-Gnome hybrid application. This spec is intended to be fed to an LLM or developer to implement the project modularly.

## 1. System Interfaces & Contracts

### 1.1 DBus Interface Definition (GNOME Extension <-> Go Backend)
The GNOME Extension will act as a DBus server to bypass Wayland security restrictions, and the Go backend will act as a client.
atabase ... 423153 files and directories currently installed.)
Preparing to unpac
- **Bus Type:** Session Bus
- **Service Name:** `org.gnome.Shell.Extensions.ClipboardGo`
- **Object Path:** `/org/gnome/Shell/Extensions/ClipboardGo`
- **Interface Name:** `org.gnome.Shell.Extensions.ClipboardGo`

**XML Introspection:**
```xml
<node>
    <interface name="org.gnome.Shell.Extensions.ClipboardGo">
        <!-- Emitted by Extension when user copies something -->
        <signal name="ClipboardChanged">
            <arg type="s" name="type"/> <!-- 'text' or 'image' -->
            <arg type="s" name="content"/> <!-- Text content or image file path -->
        </signal>
        
        <!-- Emitted by Extension when Super+Shift+V is pressed -->
        <signal name="ShowUI"/>
        
        <!-- Called by Go Backend when a user selects an item to paste -->
        <method name="InjectPaste">
            <arg type="s" direction="in" name="type"/>
            <arg type="s" direction="in" name="content"/>
        </method>
    </interface>
</node>
```

### 1.2 SQLite Database Schema (Go Backend)
Database file path: `~/.local/state/clipboard-gnome/clipboard.db`
Driver: `modernc.org/sqlite` (CGO-free SQLite for Go)

```sql
CREATE TABLE IF NOT EXISTS clipboard_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('text', 'image')), 
    content TEXT NOT NULL, 
    source_app TEXT, 
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pinned BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    tag TEXT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES clipboard_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_created_at ON clipboard_items(created_at);
```

---

## 2. Component Skeletons & Boilerplate

### 2.1 GNOME Extension Skeleton (`extension.js`)
*Target Environment: GJS (GNOME JavaScript)*

```javascript
const { St, Clutter, GLib, Gio } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const DBUS_IFACE = `
<node>
    <interface name="org.gnome.Shell.Extensions.ClipboardGo">
        <signal name="ClipboardChanged">
            <arg type="s" name="type"/>
            <arg type="s" name="content"/>
        </signal>
        <signal name="ShowUI"/>
        <method name="InjectPaste">
            <arg type="s" direction="in" name="type"/>
            <arg type="s" direction="in" name="content"/>
        </method>
    </interface>
</node>`;

class ClipboardExtension {
    constructor() {
        this._clipboard = St.Clipboard.get_default();
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBUS_IFACE, this);
    }
    
    enable() {
        // 1. Export DBus Interface on Session Bus
        this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/ClipboardGo');
        
        // 2. Connect to Clipboard signal
        // Note: For Wayland, St.Clipboard might require polling or specific signal hooks.
        // Implement logic to emit this._dbusImpl.emit_signal('ClipboardChanged', ...)
        
        // 3. Register global hotkey (Super+Shift+V)
        // Emit this._dbusImpl.emit_signal('ShowUI', null) on press
    }
    
    disable() {
        // 1. Unexport DBus
        this._dbusImpl.unexport();
        // 2. Disconnect signals & Unbind hotkey
    }
    
    // DBus Method Implementation
    InjectPaste(type, content) {
        // 1. Set St.Clipboard text using this._clipboard.set_text()
        // 2. Simulate Ctrl+V using Clutter synthetic events or external tool fallback
    }
}

function init() {
    return new ClipboardExtension();
}
```

### 2.2 Go Wails Backend Skeleton (`main.go` & `app.go`)

```go
// main.go
package main

import (
	"log"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "Clipboard-Gnome",
		Width:  400,
		Height: 600,
		Frameless:         true,
		AlwaysOnTop:       true,
		HideWindowOnClose: true,
		Linux: &linux.Options{
			WindowIsTranslucent: true,
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
```

```go
// app.go
package main

import (
	"context"
	"github.com/godbus/dbus/v5"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx  context.Context
	conn *dbus.Conn
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// 1. Initialize SQLite Database
	// 2. Connect to Session DBus via dbus.SessionBus()
	// 3. AddMatchSignal for 'ClipboardChanged' and 'ShowUI'
	// 4. Start a goroutine to listen to dbus signals channel
	//    - On ShowUI -> runtime.WindowShow(a.ctx)
	//    - On ClipboardChanged -> Insert into SQLite & notify frontend
}

// TriggerPaste is exposed to the Wails JS frontend
func (a *App) TriggerPaste(itemID int) error {
	// 1. Fetch item content from SQLite
	// 2. Hide Wails Window immediately to yield focus
	runtime.WindowHide(a.ctx)
	
	// 3. Call DBus org.gnome.Shell.Extensions.ClipboardGo.InjectPaste
	// obj := a.conn.Object("org.gnome.Shell.Extensions.ClipboardGo", "/org/gnome/Shell/Extensions/ClipboardGo")
	// obj.Call("org.gnome.Shell.Extensions.ClipboardGo.InjectPaste", 0, "text", content)
	
	return nil
}
```

---

## 3. Modular Prompt Breakdown
*Use these isolated tasks when prompting a smaller LLM model.*

### Task 1: Go SQLite Layer
**Prompt:** "Using Go and the `modernc.org/sqlite` package, write a database layer based on this schema: `[Insert Schema 1.2]`. Provide a struct with methods for `InitDB(dbPath)`, `InsertItem(itemType, content)`, and `GetRecentItems(limit)`. Ensure thread safety and handle errors properly."

### Task 2: Go DBus Client
**Prompt:** "Using the `github.com/godbus/dbus/v5` package in Go, write a client that connects to the session bus. Listen for the signals defined in this XML: `[Insert XML 1.1]`. When `ShowUI` is received, log 'Show UI'. When `ClipboardChanged` is received, log the type and content."

### Task 3: GNOME Extension DBus Server
**Prompt:** "Write a GNOME Extension in GJS that exports a DBus service on the session bus. Use this XML interface: `[Insert XML 1.1]`. Implement the `enable()` and `disable()` methods to manage the DBus export. Provide a placeholder `InjectPaste(type, content)` method that simply logs the arguments using `global.log()`."

### Task 4: GNOME Extension Global Hotkey
**Prompt:** "In a GNOME Extension (GJS), how do I bind a global hotkey (e.g., `Super+Shift+V`)? Provide the code to register this binding in the `enable()` function and unbind it in `disable()`. When the hotkey is pressed, call a function `emitShowUI()`."

### Task 5: Wails Frontend UI
**Prompt:** "Create a single-page HTML/CSS/JS frontend for a clipboard manager. It should have a clean, dark-mode design with a virtualized list or simple scrolling list of text items. When an item is clicked, it should call a `window.go.main.App.TriggerPaste(id)` function. Provide the HTML and CSS."
