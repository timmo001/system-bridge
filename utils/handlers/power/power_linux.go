//go:build linux

package power

import (
	"os/exec"
)

func shutdown() error {
	cmd := exec.Command("systemctl", "poweroff")
	return cmd.Run()
}
