import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

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

export default class ClipboardExtension extends Extension {
    enable() {
        console.log('[Clipboard-Go] Enabling extension bridge for GNOME 45+...');
        this._clipboard = St.Clipboard.get_default();
        this._lastContent = "";
        this._pollTimerId = 0;
        this._dbusImpl = null;
        this._keybindingName = 'toggle-clipboard-go';

        // 1. Export DBus Interface on Session Bus
        try {
            this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBUS_IFACE, this);
            this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/ClipboardGo');
            console.log('[Clipboard-Go] DBus interface exported at /org/gnome/Shell/Extensions/ClipboardGo');
        } catch (e) {
            console.error(`[Clipboard-Go] Error exporting DBus interface: ${e}`);
        }

        // 2. Start Clipboard Polling
        this._startClipboardMonitoring();

        // 3. Register Global Hotkey
        this._registerHotkey();
    }

    disable() {
        console.log('[Clipboard-Go] Disabling extension bridge...');

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
            Main.wm.addKeybinding(
                this._keybindingName,
                new Gio.Settings({ schema_id: 'org.gnome.shell.keybindings' }),
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    console.log('[Clipboard-Go] Global hotkey pressed, emitting ShowUI signal');
                    if (this._dbusImpl) {
                        this._dbusImpl.emit_signal('ShowUI', null);
                    }
                }
            );
        } catch (e) {
            console.warn(`[Clipboard-Go] Keybinding warning: ${e}`);
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
        console.log(`[Clipboard-Go] InjectPaste invoked (type=${type}, len=${content.length})`);
        
        this._lastContent = content;
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, content);

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            try {
                const seat = Clutter.get_default_backend().get_default_seat();
                if (seat) {
                    const now = 0;
                    seat.handle_event(Clutter.Event.new_key(Clutter.EventType.KEY_PRESS, now, Clutter.EventFlags.NONE, Clutter.ModifierType.CONTROL_MASK, Clutter.KEY_v, 0));
                    seat.handle_event(Clutter.Event.new_key(Clutter.EventType.KEY_RELEASE, now, Clutter.EventFlags.NONE, Clutter.ModifierType.CONTROL_MASK, Clutter.KEY_v, 0));
                }
            } catch (err) {
                console.error(`[Clipboard-Go] Clutter synthetic event error: ${err}`);
            }
            return GLib.SOURCE_REMOVE;
        });
    }
}
