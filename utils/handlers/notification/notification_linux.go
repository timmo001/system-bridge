//go:build linux

package notification

import (
	"os/exec"
	"strconv"
)

func send(data NotificationData) error {
	args := []string{
		"--app-name=System Bridge",
		"--urgency=normal",
	}

	if data.Icon != "" {
		args = append(args, "--icon="+data.Icon)
	}

	if data.Duration > 0 {
		args = append(args, "--expire-time="+strconv.Itoa(data.Duration))
	}

	if data.Title != "" {
		args = append(args, data.Title)
	} else {
		args = append(args, "Notification")
	}

	args = append(args, data.Message)

	cmd := exec.Command("notify-send", args...)
	return cmd.Run()
}
