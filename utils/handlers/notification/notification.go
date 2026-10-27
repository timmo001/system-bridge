package notification

import (
	"errors"
	"log/slog"
	"sync"
)

// defaultNotifier is the package-level notifier used by Send().
// It can be set via SetDefaultNotifier() to enable action callbacks.
var (
	defaultNotifier   *Notifier
	defaultNotifierMu sync.RWMutex
)

// SetDefaultNotifier sets the package-level notifier used by Send().
// This allows the application to configure action callbacks (OpenURL, OpenPath)
// that will be used for all notifications sent via Send().
func SetDefaultNotifier(n *Notifier) {
	defaultNotifierMu.Lock()
	defer defaultNotifierMu.Unlock()
	defaultNotifier = n
}

// GetDefaultNotifier returns the package-level notifier, or nil if not set.
func GetDefaultNotifier() *Notifier {
	defaultNotifierMu.RLock()
	defer defaultNotifierMu.RUnlock()
	return defaultNotifier
}

// NotificationData represents the data needed for a notification
type NotificationData struct {
	Title      string `json:"title" mapstructure:"title"`
	Message    string `json:"message" mapstructure:"message"`
	Icon       string `json:"icon,omitempty" mapstructure:"icon"`
	Duration   int    `json:"duration,omitempty" mapstructure:"duration"`     // Duration in milliseconds
	ActionURL  string `json:"actionUrl,omitempty" mapstructure:"actionUrl"`   // URL to open when notification is clicked
	ActionPath string `json:"actionPath,omitempty" mapstructure:"actionPath"` // File/folder path to open when notification is clicked
	Sound      string `json:"sound,omitempty" mapstructure:"sound"`           // Path to sound file to play
	// Urgency is low, normal or critical. Critical ones stay until
	// dismissed. Linux only.
	Urgency string `json:"urgency,omitempty" mapstructure:"urgency"`
	// Buttons on the notification. Pressing one sends a NOTIFICATION_ACTION
	// event with its id. Linux only. Not actions, which older connectors send
	// in another shape.
	Buttons []NotificationButton `json:"buttons,omitempty" mapstructure:"buttons"`
}

// NotificationButton is a button on a notification
type NotificationButton struct {
	ID    string `json:"id" mapstructure:"id"`
	Label string `json:"label" mapstructure:"label"`
}

// DefaultAction is the action of clicking a notification rather than one of
// its buttons
const DefaultAction = "default"

// Event is something that happened to a notification System Bridge sent:
// clicking it or a button on it, or it closing
type Event struct {
	ID uint32
	// Action is the button's id, or DefaultAction for the notification
	// itself. Empty when it closed.
	Action string
	// Reason is why it closed: expired, dismissed or closed (by
	// NOTIFICATION_DISMISS). Empty when it was clicked.
	Reason string
}

// ErrUnsupported is returned for what this platform's notifications can't do
var ErrUnsupported = errors.New("not supported by notifications on this platform")

var (
	eventHandler   func(Event)
	eventHandlerMu sync.RWMutex
)

// OnEvent sets the function told when a notification is clicked or closes
func OnEvent(handler func(Event)) {
	eventHandlerMu.Lock()
	eventHandler = handler
	eventHandlerMu.Unlock()
}

func emit(event Event) {
	eventHandlerMu.RLock()
	handler := eventHandler
	eventHandlerMu.RUnlock()
	if handler != nil {
		handler(event)
	}
}

// Notifier handles desktop notifications
type Notifier struct {
	appName   string
	soundFile string
	platform  platformNotifier
}

// platformNotifier is implemented by each platform
type platformNotifier interface {
	notify(data NotificationData) (uint32, error)
	dismiss(id uint32) error
	close() error
}

// NotifierOptions contains optional configuration for creating a Notifier
type NotifierOptions struct {
	// AppName is shown in notifications (defaults to "System Bridge")
	AppName string
	// SoundFile is the default sound file path (optional)
	SoundFile string
	// OpenURL is called when a notification with ActionURL is clicked
	OpenURL func(string) error
	// OpenPath is called when a notification with ActionPath is clicked
	OpenPath func(string) error
}

// NewNotifier creates a new notification handler
func NewNotifier(opts NotifierOptions) (*Notifier, error) {
	appName := opts.AppName
	if appName == "" {
		appName = "System Bridge"
	}

	platform, err := newPlatformNotifier(appName, opts.OpenURL, opts.OpenPath)
	if err != nil {
		return nil, err
	}

	return &Notifier{
		appName:   appName,
		soundFile: opts.SoundFile,
		platform:  platform,
	}, nil
}

// Send sends a notification and returns the notification ID
func (n *Notifier) Send(data NotificationData) (uint32, error) {
	// Use default sound if not specified in data
	soundToPlay := data.Sound
	if soundToPlay == "" {
		soundToPlay = n.soundFile
	}

	// Play sound if configured (non-blocking)
	if soundToPlay != "" {
		go func() {
			if err := playSound(soundToPlay); err != nil {
				slog.Debug("Failed to play notification sound", "file", soundToPlay, "error", err)
			}
		}()
	}

	return n.platform.notify(data)
}

// Close closes the notifier and releases resources
func (n *Notifier) Close() error {
	if n.platform != nil {
		return n.platform.close()
	}
	return nil
}

// Send is a convenience function for sending notifications.
// If a default notifier has been set via SetDefaultNotifier(), it will be used
// (enabling action callbacks like OpenURL and OpenPath).
// Otherwise, a temporary notifier with default settings is created.
func Send(data NotificationData) error {
	_, err := SendWithID(data)
	return err
}

// SendWithID sends a notification like Send, returning its id for
// Dismiss and the events about it. The id is 0 when there's no default
// notifier to follow it with.
func SendWithID(data NotificationData) (uint32, error) {
	// Try to use the default notifier if set
	defaultNotifierMu.RLock()
	notifier := defaultNotifier
	defaultNotifierMu.RUnlock()

	if notifier != nil {
		return notifier.Send(data)
	}

	// Fall back to creating a temporary notifier
	tempNotifier, err := NewNotifier(NotifierOptions{})
	if err != nil {
		return 0, err
	}
	defer func() {
		if err := tempNotifier.Close(); err != nil {
			slog.Debug("Failed to close temporary notifier", "error", err)
		}
	}()

	_, err = tempNotifier.Send(data)
	return 0, err
}

// Dismiss closes a notification System Bridge sent, by its id
func Dismiss(id uint32) error {
	defaultNotifierMu.RLock()
	notifier := defaultNotifier
	defaultNotifierMu.RUnlock()

	if notifier == nil {
		return errors.New("notifications aren't set up")
	}
	return notifier.platform.dismiss(id)
}
