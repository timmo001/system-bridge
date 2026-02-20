//go:build linux

package power

import (
	"os"
	"os/exec"
)

func shutdown() error {
	cmd := exec.Command("systemctl", "poweroff")
	return cmd.Run()
}

func restart() error {
	cmd := exec.Command("systemctl", "reboot")
	return cmd.Run()
}

func sleep() error {
	cmd := exec.Command("systemctl", "suspend")
	return cmd.Run()
}

func hibernate() error {
	cmd := exec.Command("systemctl", "hibernate")
	return cmd.Run()
}

func lock() error {
	cmd := exec.Command("loginctl", "lock-session")
	return cmd.Run()
}

func logout() error {
	sessionID := os.Getenv("XDG_SESSION_ID")
	if sessionID == "" {
		sessionID = "self"
	}
	cmd := exec.Command("loginctl", "terminate-session", sessionID)
	return cmd.Run()
}
