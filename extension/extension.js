const { St, Clutter, GLib, Gio, Meta, Shell } = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

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
        this._lastContent = "";
        this._pollTimerId = 0;
        this._dbusImpl = null;
        this._keybindingName = 'toggle-clipboard-go';
    }

    enable() {
        log('[Clipboard-Go] Enabling extension bridge...');

        // 1. Export DBus Interface on Session Bus
        try {
            this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBUS_IFACE, this);
            this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/ClipboardGo');
            log('[Clipboard-Go] DBus interface exported at /org/gnome/Shell/Extensions/ClipboardGo');
        } catch (e) {
            log(`[Clipboard-Go] Error exporting DBus interface: ${e}`);
        }

        // 2. Start Clipboard Polling / Listener for Wayland compatibility
        this._startClipboardMonitoring();

        // 3. Register Global Hotkey (Super+Shift+V)
        this._registerHotkey();
    }

    disable() {
        log('[Clipboard-Go] Disabling extension bridge...');

        // 1. Stop Clipboard Polling
        this._stopClipboardMonitoring();

        // 2. Unregister Hotkey
        this._unregisterHotkey();

        // 3. Unexport DBus
        if (this._dbusImpl) {
            this._dbusImpl.unexport();
            this._dbusImpl = null;
        }
    }

    _startClipboardMonitoring() {
        // Poll clipboard every 500ms (lightweight, non-blocking check)
        this._pollTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._checkClipboardContent();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopClipboardMonitoring() {
        if (this._pollTimerId > 0) {
            GLib.source_remove(this._pollTimerId);
            this._pollTimerId = 0;
        }
    }

    _checkClipboardContent() {
        try {
            this._clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
                if (text && text.trim().length > 0 && text !== this._lastContent) {
                    this._lastContent = text;
                    if (this._dbusImpl) {
                        log(`[Clipboard-Go] ClipboardChanged emitted (${text.length} chars)`);
                        this._dbusImpl.emit_signal('ClipboardChanged', new GLib.Variant('(ss)', ['text', text]));
                    }
                }
            });
        } catch (e) {
            // Ignore temporary read errors
        }
    }

    _registerHotkey() {
        try {
            const ModeType = Shell.ActionMode ? Shell.ActionMode : Shell.KeyBindingMode;
            Main.wm.addKeybinding(
                this._keybindingName,
                new Gio.Settings({ schema_id: 'org.gnome.shell.keybindings' }),
                Meta.KeyBindingFlags.NONE,
                ModeType.ALL,
                () => {
                    log('[Clipboard-Go] Global hotkey pressed, emitting ShowUI signal');
                    if (this._dbusImpl) {
                        this._dbusImpl.emit_signal('ShowUI', null);
                    }
                }
            );
        } catch (e) {
            log(`[Clipboard-Go] Keybinding registration warning: ${e}. Using fallback signal listener.`);
        }
    }

    _unregisterHotkey() {
        try {
            Main.wm.removeKeybinding(this._keybindingName);
        } catch (e) {
            // Ignore cleanup errors
        }
    }

    // DBus Method: InjectPaste
    InjectPaste(type, content) {
        log(`[Clipboard-Go] InjectPaste invoked (type=${type}, len=${content.length})`);
        
        // 1. Update GNOME Shell clipboard text
        this._lastContent = content; // avoid re-recording our own pasted item
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, content);

        // 2. Yield focus and simulate Ctrl+V keystroke into active window
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            try {
                const seat = Clutter.get_default_backend().get_default_seat();
                if (seat) {
                    const now = CLUTTER_CURRENT_TIME || 0;
                    // Press Ctrl + V
                    seat.handle_event(Clutter.Event.new_key(Clutter.EventType.KEY_PRESS, now, Clutter.EventFlags.NONE, Clutter.ModifierType.CONTROL_MASK, Clutter.KEY_v, 0));
                    seat.handle_event(Clutter.Event.new_key(Clutter.EventType.KEY_RELEASE, now, Clutter.EventFlags.NONE, Clutter.ModifierType.CONTROL_MASK, Clutter.KEY_v, 0));
                }
            } catch (err) {
                log(`[Clipboard-Go] Clutter synthetic event error: ${err}`);
            }
            return GLib.SOURCE_REMOVE;
        });
    }
}

function init() {
    return new ClipboardExtension();
}
