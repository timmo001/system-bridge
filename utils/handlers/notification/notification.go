package notification

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
	openURL   func(string) error
	openPath  func(string) error
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
		openURL:   opts.OpenURL,
		openPath:  opts.OpenPath,
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
				// Log error but don't fail the notification
				_ = err
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

// Send is a convenience function for simple notifications without creating a Notifier.
// It creates a temporary notifier with default settings.
// For applications that send many notifications, use NewNotifier() instead.
func Send(data NotificationData) error {
	notifier, err := NewNotifier(NotifierOptions{})
	if err != nil {
		return err
	}
	defer notifier.Close()

	_, err = notifier.Send(data)
	return err
}
