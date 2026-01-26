//go:build linux

package notification

import (
	"fmt"
	"log/slog"
	"sync"

	"github.com/godbus/dbus/v5"
)

const (
	dbusInterface   = "org.freedesktop.Notifications"
	dbusPath        = "/org/freedesktop/Notifications"
	dbusDestination = "org.freedesktop.Notifications"
)

// notificationAction represents what to do when a notification is clicked
type notificationAction struct {
	url  string // URL to open (takes precedence)
	path string // File/folder path to open
}

// linuxNotifier handles desktop notifications via DBus with action support
type linuxNotifier struct {
	conn    *dbus.Conn
	appName string

	// Track notification IDs to their associated actions for click handling
	mu           sync.RWMutex
	notifActions map[uint32]notificationAction

	// Action callbacks
	openURL  func(string) error
	openPath func(string) error

	// Done channel to stop the signal listener
	done chan struct{}
}

// newPlatformNotifier creates a new DBus notification handler for Linux
func newPlatformNotifier(appName string, openURL, openPath func(string) error) (platformNotifier, error) {
	// Use a private connection so we can safely close it without affecting
	// other DBus users (like systray) that use the shared session bus
	conn, err := dbus.SessionBusPrivate()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to session bus: %w", err)
	}

	// Authenticate with the bus
	if err = conn.Auth(nil); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to authenticate with session bus: %w", err)
	}

	// Say hello to the bus
	if err = conn.Hello(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to send Hello to session bus: %w", err)
	}

	n := &linuxNotifier{
		conn:         conn,
		appName:      appName,
		notifActions: make(map[uint32]notificationAction),
		openURL:      openURL,
		openPath:     openPath,
		done:         make(chan struct{}),
	}

	// Start listening for action signals
	if err := n.listenForActions(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to setup action listener: %w", err)
	}

	return n, nil
}

// listenForActions sets up a listener for ActionInvoked and NotificationClosed signals
func (n *linuxNotifier) listenForActions() error {
	// Add match rules for the signals we care about
	if err := n.conn.AddMatchSignal(
		dbus.WithMatchInterface(dbusInterface),
		dbus.WithMatchMember("ActionInvoked"),
	); err != nil {
		return fmt.Errorf("failed to add ActionInvoked match: %w", err)
	}

	if err := n.conn.AddMatchSignal(
		dbus.WithMatchInterface(dbusInterface),
		dbus.WithMatchMember("NotificationClosed"),
	); err != nil {
		return fmt.Errorf("failed to add NotificationClosed match: %w", err)
	}

	// Start goroutine to handle signals
	signals := make(chan *dbus.Signal, 10)
	n.conn.Signal(signals)

	go func() {
		for {
			select {
			case sig := <-signals:
				if sig == nil {
					return
				}
				n.handleSignal(sig)
			case <-n.done:
				return
			}
		}
	}()

	return nil
}

// handleSignal processes DBus signals
func (n *linuxNotifier) handleSignal(sig *dbus.Signal) {
	switch sig.Name {
	case dbusInterface + ".ActionInvoked":
		if len(sig.Body) >= 2 {
			notifID, ok1 := sig.Body[0].(uint32)
			actionKey, ok2 := sig.Body[1].(string)
			if ok1 && ok2 {
				n.handleAction(notifID, actionKey)
			}
		}
	case dbusInterface + ".NotificationClosed":
		if len(sig.Body) >= 1 {
			notifID, ok := sig.Body[0].(uint32)
			if ok {
				n.cleanupNotification(notifID)
			}
		}
	}
}

// handleAction is called when a notification action is invoked
func (n *linuxNotifier) handleAction(notifID uint32, actionKey string) {
	n.mu.RLock()
	action, exists := n.notifActions[notifID]
	n.mu.RUnlock()

	if !exists {
		slog.Debug("Action invoked for unknown notification", "notifID", notifID)
		return
	}

	if actionKey == "default" {
		// URL takes precedence over path
		if action.url != "" && n.openURL != nil {
			slog.Debug("Opening URL from notification click", "url", action.url)
			if err := n.openURL(action.url); err != nil {
				slog.Error("Failed to open URL from notification", "url", action.url, "error", err)
			}
		} else if action.path != "" && n.openPath != nil {
			slog.Debug("Opening path from notification click", "path", action.path)
			if err := n.openPath(action.path); err != nil {
				slog.Error("Failed to open path from notification", "path", action.path, "error", err)
			}
		}
	}

	// Clean up after action is handled
	n.cleanupNotification(notifID)
}

// cleanupNotification removes a notification from tracking
func (n *linuxNotifier) cleanupNotification(notifID uint32) {
	n.mu.Lock()
	delete(n.notifActions, notifID)
	n.mu.Unlock()
}

// notify sends a notification via DBus
func (n *linuxNotifier) notify(data NotificationData) (uint32, error) {
	obj := n.conn.Object(dbusDestination, dbusPath)

	// Build actions array
	// "default" is a special action key that's invoked when clicking the notification body
	var actions []string
	hasAction := data.ActionURL != "" || data.ActionPath != ""
	if hasAction {
		actions = []string{"default", "Open"}
	}

	// Hints can include things like urgency, category, etc.
	hints := map[string]dbus.Variant{
		"urgency": dbus.MakeVariant(byte(1)), // Normal urgency
	}

	// Timeout: -1 means use notification daemon's default, otherwise use Duration
	timeout := int32(-1)
	if data.Duration > 0 {
		timeout = int32(data.Duration)
	}

	// Call the Notify method
	// Signature: Notify(app_name, replaces_id, app_icon, summary, body, actions, hints, expire_timeout) -> notification_id
	call := obj.Call(
		dbusInterface+".Notify",
		0,
		n.appName,    // app_name
		uint32(0),    // replaces_id (0 = new notification)
		data.Icon,    // app_icon
		data.Title,   // summary
		data.Message, // body
		actions,      // actions
		hints,        // hints
		timeout,      // expire_timeout
	)

	if call.Err != nil {
		return 0, fmt.Errorf("notify call failed: %w", call.Err)
	}

	var notifID uint32
	if err := call.Store(&notifID); err != nil {
		return 0, fmt.Errorf("failed to get notification ID: %w", err)
	}

	// Track the action for this notification if provided
	if hasAction {
		n.mu.Lock()
		n.notifActions[notifID] = notificationAction{
			url:  data.ActionURL,
			path: data.ActionPath,
		}
		n.mu.Unlock()
	}

	return notifID, nil
}

// close closes the DBus connection
func (n *linuxNotifier) close() error {
	close(n.done)
	if n.conn != nil {
		return n.conn.Close()
	}
	return nil
}
