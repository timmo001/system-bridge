//go:build windows

package notification

import (
	"github.com/go-toast/toast"
)

// windowsNotifier handles notifications on Windows via go-toast
type windowsNotifier struct {
	appName  string
	openURL  func(string) error
	openPath func(string) error
}

// newPlatformNotifier creates a new notification handler for Windows
func newPlatformNotifier(appName string, openURL, openPath func(string) error) (platformNotifier, error) {
	return &windowsNotifier{
		appName:  appName,
		openURL:  openURL,
		openPath: openPath,
	}, nil
}

// notify sends a notification via go-toast
func (n *windowsNotifier) notify(data NotificationData) (uint32, error) {
	notification := toast.Notification{
		AppID:   n.appName,
		Title:   data.Title,
		Message: data.Message,
	}

	if data.Icon != "" {
		notification.Icon = data.Icon
	}

	if data.Duration > 0 {
		// go-toast supports Duration: toast.Short or toast.Long (not ms), so pick based on threshold
		if data.Duration >= 7000 {
			notification.Duration = toast.Long
		} else {
			notification.Duration = toast.Short
		}
	}

	// Note: Windows toast notifications can support action URLs via ActivationArguments,
	// but this requires more complex setup with protocol handlers.
	// For now, we don't support click-to-open on Windows.

	if err := notification.Push(); err != nil {
		return 0, err
	}

	// go-toast doesn't return a notification ID
	return 0, nil
}

// close is a no-op on Windows
func (n *windowsNotifier) close() error {
	return nil
}

// playSound is a no-op on Windows (system handles notification sounds)
func playSound(_ string) error {
	// Windows handles notification sounds through system settings
	return nil
}
