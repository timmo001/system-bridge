//go:build darwin

package notification

import (
	"fmt"
	"os/exec"
)

// darwinNotifier handles notifications on macOS via AppleScript
type darwinNotifier struct {
	appName  string
	openURL  func(string) error
	openPath func(string) error
}

// newPlatformNotifier creates a new notification handler for macOS
func newPlatformNotifier(appName string, openURL, openPath func(string) error) (platformNotifier, error) {
	return &darwinNotifier{
		appName:  appName,
		openURL:  openURL,
		openPath: openPath,
	}, nil
}

// notify sends a notification via AppleScript
func (n *darwinNotifier) notify(data NotificationData) (uint32, error) {
	script := fmt.Sprintf(`display notification "%s" with title "%s"`, data.Message, data.Title)
	if data.Icon != "" {
		script = fmt.Sprintf(`%s subtitle "%s"`, script, data.Icon)
	}

	cmd := exec.Command("osascript", "-e", script)
	if err := cmd.Run(); err != nil {
		return 0, fmt.Errorf("failed to send notification: %w", err)
	}

	// macOS AppleScript doesn't return a notification ID
	return 0, nil
}

// close is a no-op on macOS
func (n *darwinNotifier) close() error {
	return nil
}

// playSound is a no-op on macOS (system handles notification sounds)
func playSound(_ string) error {
	// macOS handles notification sounds through system preferences
	return nil
}
