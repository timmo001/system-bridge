package notification

import (
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
	// Try to use the default notifier if set
	defaultNotifierMu.RLock()
	notifier := defaultNotifier
	defaultNotifierMu.RUnlock()

	if notifier != nil {
		_, err := notifier.Send(data)
		return err
	}

	// Fall back to creating a temporary notifier
	tempNotifier, err := NewNotifier(NotifierOptions{})
	if err != nil {
		return err
	}
	defer func() {
		if err := tempNotifier.Close(); err != nil {
			slog.Debug("Failed to close temporary notifier", "error", err)
		}
	}()

	_, err = tempNotifier.Send(data)
	return err
}
