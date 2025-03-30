package utils

import (
	"github.com/timmo001/system-bridge/utils/handlers/notification"
)

// SendStartupNotification sends a notification that the application has started
func SendStartupNotification() error {
	return notification.Send(notification.NotificationData{
		Title:   "System Bridge",
		Message: "Application has started",
		Icon:    "system-bridge",
	})
}
