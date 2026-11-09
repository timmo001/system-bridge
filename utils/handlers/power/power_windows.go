//go:build windows

package power

import (
	"os/exec"

	"github.com/timmo001/system-bridge/utils"
)

func shutdown() error {
	cmd := exec.Command("shutdown", "/s")
	utils.SetHideWindow(cmd)
	return cmd.Run()
}
