//go:build darwin

package notification

import (
	"errors"
	"log/slog"
)

var errNotImplemented = errors.New("notifications are not implemented on macOS")

// darwinNotifier is a stub implementation for macOS
type darwinNotifier struct{}

// newPlatformNotifier returns a stub notifier for macOS
func newPlatformNotifier(appName string, openURL, openPath func(string) error) (platformNotifier, error) {
	slog.Warn("Notifications are not implemented on macOS")
	return &darwinNotifier{}, nil
}

// notify logs a warning and returns an error on macOS
func (n *darwinNotifier) notify(data NotificationData) (uint32, error) {
	slog.Warn("Notification not sent: not implemented on macOS", "title", data.Title)
	return 0, errNotImplemented
}

// close is a no-op on macOS
func (n *darwinNotifier) close() error {
	return nil
}

// playSound is not implemented on macOS
func playSound(_ string) error {
	return errNotImplemented
}
