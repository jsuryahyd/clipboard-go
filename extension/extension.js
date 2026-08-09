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
        console.log('[Clipboard-Gnome] Enabling extension bridge for GNOME 45+...');
        this._clipboard = St.Clipboard.get_default();
        this._lastContent = "";
        this._pollTimerId = 0;
        this._dbusImpl = null;
        this._keybindingName = 'toggle-clipboard-gnome';

        // 1. Export DBus Interface on Session Bus
        try {
            this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBUS_IFACE, this);
            this._dbusImpl.export(Gio.DBus.session, '/org/gnome/Shell/Extensions/ClipboardGo');
            console.log('[Clipboard-Gnome] DBus interface exported at /org/gnome/Shell/Extensions/ClipboardGo');
        } catch (e) {
            console.error(`[Clipboard-Gnome] Error exporting DBus interface: ${e}`);
        }

        // 2. Start Clipboard Polling
        this._startClipboardMonitoring();

        // 3. Register Global Hotkey
        this._registerHotkey();
    }

    disable() {
        console.log('[Clipboard-Gnome] Disabling extension bridge...');

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
            const settings = this.getSettings('org.gnome.shell.extensions.clipboard-gnome');
            Main.wm.addKeybinding(
                this._keybindingName,
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    console.log('[Clipboard-Gnome] Global hotkey pressed, emitting ShowUI signal');
                    if (this._dbusImpl) {
                        this._dbusImpl.emit_signal('ShowUI', null);
                    }
                }
            );
        } catch (e) {
            console.warn(`[Clipboard-Gnome] Keybinding warning: ${e}`);
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
        console.log(`[Clipboard-Gnome] InjectPaste invoked (type=${type}, len=${content.length})`);
        
        this._lastContent = content;
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, content);

        console.warn('[Clipboard-Gnome] Auto-paste via Clutter synthetic event disabled to prevent GNOME Shell Wayland crash.');
        // The Go application should use 'wtype' or 'ydotool' to trigger Ctrl+V, 
        // as injecting Clutter key events from extensions is restricted and causes C segfaults.
    }
}
