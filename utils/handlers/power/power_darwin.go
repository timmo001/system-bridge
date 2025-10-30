//go:build darwin

package power

import (
	"os/exec"
)

func shutdown() error {
	cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to shut down")
	return cmd.Run()
}

func restart() error {
	cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to restart")
	return cmd.Run()
}

func sleep() error {
	cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to sleep")
	return cmd.Run()
}

func hibernate() error {
	// macOS doesn't have a separate hibernate command, using sleep instead
	return sleep()
}

func lock() error {
	cmd := exec.Command("/System/Library/CoreServices/Menu Extras/User.menu/Contents/.resources/CGSession", "-suspend")
	return cmd.Run()
}

func logout() error {
	cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to log out")
	return cmd.Run()
}
