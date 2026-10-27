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

// urgencies are the notification spec's urgency levels
var urgencies = map[string]byte{
	"low":      0,
	"normal":   1,
	"critical": 2,
}

// closeReasons are why the notification spec says a notification closed
var closeReasons = map[uint32]string{
	1: "expired",
	2: "dismissed",
	3: "closed",
}

// notificationAction represents what to do when a notification is clicked
type notificationAction struct {
	url  string // URL to open (takes precedence)
	path string // File/folder path to open
}

// linuxNotifier handles desktop notifications via DBus with action support
type linuxNotifier struct {
	conn    *dbus.Conn
	appName string

	// The notifications this notifier sent, with what clicking each opens.
	// The daemon signals clicks and closes for every app's notifications, so
	// only these are acted on.
	mu   sync.RWMutex
	sent map[uint32]notificationAction

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
		conn:     conn,
		appName:  appName,
		sent:     make(map[uint32]notificationAction),
		openURL:  openURL,
		openPath: openPath,
		done:     make(chan struct{}),
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
		if len(sig.Body) >= 2 {
			notifID, ok1 := sig.Body[0].(uint32)
			reason, ok2 := sig.Body[1].(uint32)
			if ok1 && ok2 && n.forget(notifID) {
				closed, known := closeReasons[reason]
				if !known {
					closed = "unknown"
				}
				emit(Event{ID: notifID, Reason: closed})
			}
		}
	}
}

// handleAction is called when a notification action is invoked
func (n *linuxNotifier) handleAction(notifID uint32, actionKey string) {
	n.mu.RLock()
	action, exists := n.sent[notifID]
	n.mu.RUnlock()

	if !exists {
		return
	}

	if actionKey == DefaultAction {
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

	emit(Event{ID: notifID, Action: actionKey})
}

// forget stops following a notification, reporting whether it was one this
// notifier sent
func (n *linuxNotifier) forget(notifID uint32) bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	_, ok := n.sent[notifID]
	delete(n.sent, notifID)
	return ok
}

// notify sends a notification via DBus
func (n *linuxNotifier) notify(data NotificationData) (uint32, error) {
	obj := n.conn.Object(dbusDestination, dbusPath)

	// Actions are pairs of key and label. "default" is invoked when clicking
	// the notification itself, so clicks are reported even without a URL or
	// path to open; the label is only shown by daemons that list it.
	actions := []string{DefaultAction, "Open"}
	for _, button := range data.Buttons {
		actions = append(actions, button.ID, button.Label)
	}

	urgency, ok := urgencies[data.Urgency]
	if !ok {
		urgency = urgencies["normal"]
	}
	hints := map[string]dbus.Variant{
		"urgency": dbus.MakeVariant(urgency),
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

	n.mu.Lock()
	n.sent[notifID] = notificationAction{
		url:  data.ActionURL,
		path: data.ActionPath,
	}
	n.mu.Unlock()

	return notifID, nil
}

// dismiss closes a notification this notifier sent
func (n *linuxNotifier) dismiss(id uint32) error {
	n.mu.RLock()
	_, ok := n.sent[id]
	n.mu.RUnlock()
	if !ok {
		return fmt.Errorf("no notification %d from System Bridge is open", id)
	}

	if err := n.conn.Object(dbusDestination, dbusPath).Call(dbusInterface+".CloseNotification", 0, id).Err; err != nil {
		return fmt.Errorf("close the notification: %w", err)
	}
	return nil
}

// close closes the DBus connection
func (n *linuxNotifier) close() error {
	close(n.done)
	if n.conn != nil {
		return n.conn.Close()
	}
	return nil
}
