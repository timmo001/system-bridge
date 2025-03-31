//go:build linux
// +build linux

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

	if data.Title != "" {
		args = append(args, "--title="+data.Title)
	}

	if data.Icon != "" {
		args = append(args, "--icon="+data.Icon)
	}

	if data.Duration > 0 {
		args = append(args, "--expire-time="+strconv.Itoa(data.Duration))
	}

	args = append(args, data.Message)

	cmd := exec.Command("notify-send", args...)
	return cmd.Run()
}
