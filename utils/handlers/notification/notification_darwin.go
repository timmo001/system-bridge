//go:build darwin

package notification

import (
	"fmt"
	"os/exec"
)

func send(data NotificationData) error {
	script := fmt.Sprintf(`display notification "%s" with title "%s"`, data.Message, data.Title)
	if data.Icon != "" {
		script = fmt.Sprintf(`%s subtitle "%s"`, script, data.Icon)
	}

	cmd := exec.Command("osascript", "-e", script)
	return cmd.Run()
}
