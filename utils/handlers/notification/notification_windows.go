//go:build windows
// +build windows

package notification

import (
	"os"
	"path/filepath"

	"gopkg.in/toast.v1"
)

func send(data NotificationData) error {
	// Create a shortcut in the Windows start menu to enable notifications
	startMenuPath := os.Getenv("APPDATA") + "\\Microsoft\\Windows\\Start Menu\\Programs"
	shortcutPath := filepath.Join(startMenuPath, "System Bridge.lnk")

	notification := toast.Notification{
		AppID:    "System Bridge",
		Title:    "System Bridge",
		Message:  "Hello, world!",
		// Title:    data.Title,
		// Message:  data.Message,
		// Icon:     data.Icon,
		// Duration: toast.Long,
		// Actions: []toast.Action{
		// 	{Type: "system", Label: "Dismiss", Arguments: "dismiss"},
		// },
	}

	// Create shortcut if it doesn't exist
	if _, err := os.Stat(shortcutPath); os.IsNotExist(err) {
		// Create an empty shortcut file
		f, err := os.Create(shortcutPath)
		if err != nil {
			return err
		}
		f.Close()
	}

	return notification.Push()
}
