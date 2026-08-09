package dbus

import (
	"fmt"
	"sync"

	"github.com/godbus/dbus/v5"
	"clipboard-go/internal/logger"
)

const (
	DBusService   = "org.gnome.Shell.Extensions.ClipboardGo"
	DBusObject    = "/org/gnome/Shell/Extensions/ClipboardGo"
	DBusInterface = "org.gnome.Shell.Extensions.ClipboardGo"
)

type Client struct {
	conn       *dbus.Conn
	signalChan chan *dbus.Signal
	stopChan   chan struct{}
	mu         sync.Mutex
	isClosed   bool

	OnClipboardChanged func(itemType, content string)
	OnShowUI           func()
}

// NewClient initializes a new DBus client on the session bus.
func NewClient(onClipboardChanged func(itemType, content string), onShowUI func()) (*Client, error) {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to session dbus: %w", err)
	}

	c := &Client{
		conn:               conn,
		signalChan:         make(chan *dbus.Signal, 100),
		stopChan:           make(chan struct{}),
		OnClipboardChanged: onClipboardChanged,
		OnShowUI:           onShowUI,
	}

	// Register signal channel with DBus connection
	conn.Signal(c.signalChan)

	// Add match rules for extension signals
	matchRules := []string{
		fmt.Sprintf("type='signal',interface='%s',member='ClipboardChanged'", DBusInterface),
		fmt.Sprintf("type='signal',interface='%s',member='ShowUI'", DBusInterface),
	}

	for _, rule := range matchRules {
		call := conn.BusObject().Call("org.freedesktop.DBus.AddMatch", 0, rule)
		if call.Err != nil {
			logger.Warn("DBus AddMatch rule warning (%s): %v", rule, call.Err)
		}
	}

	go c.listenLoop()

	logger.Info("DBus client initialized and listening for GNOME extension signals")
	return c, nil
}

func (c *Client) listenLoop() {
	for {
		select {
		case <-c.stopChan:
			return
		case sig, ok := <-c.signalChan:
			if !ok {
				return
			}
			if sig == nil {
				continue
			}

			logger.Debug("Received DBus signal: %s.%s", sig.Name, sig.Name)

			switch sig.Name {
			case DBusInterface + ".ClipboardChanged":
				if len(sig.Body) >= 2 {
					itemType, ok1 := sig.Body[0].(string)
					content, ok2 := sig.Body[1].(string)
					if ok1 && ok2 && c.OnClipboardChanged != nil {
						c.OnClipboardChanged(itemType, content)
					}
				}
			case DBusInterface + ".ShowUI":
				if c.OnShowUI != nil {
					c.OnShowUI()
				}
			}
		}
	}
}

// InjectPaste calls the GNOME Extension DBus method to set content and simulate Ctrl+V
func (c *Client) InjectPaste(itemType, content string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.isClosed || c.conn == nil {
		return fmt.Errorf("dbus client is closed")
	}

	obj := c.conn.Object(DBusService, dbus.ObjectPath(DBusObject))
	call := obj.Call(DBusInterface+".InjectPaste", 0, itemType, content)
	if call.Err != nil {
		logger.Error("DBus InjectPaste call failed: %v", call.Err)
		return call.Err
	}

	logger.Info("DBus InjectPaste successfully sent to extension (type: %s)", itemType)
	return nil
}

// Close cleans up DBus connections
func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.isClosed {
		return
	}
	c.isClosed = true
	close(c.stopChan)

	if c.conn != nil {
		c.conn.RemoveSignal(c.signalChan)
		_ = c.conn.Close()
	}
}
