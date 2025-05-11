//go:build windows
// +build windows

package notification

import (
	"github.com/go-toast/toast"
)

func send(data NotificationData) error {
	notification := toast.Notification{
		AppID:   "System Bridge",
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
	return notification.Push()
}
