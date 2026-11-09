//go:build darwin

package power

import (
	"os/exec"
)

func shutdown() error {
	cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to shut down")
	return cmd.Run()
}
