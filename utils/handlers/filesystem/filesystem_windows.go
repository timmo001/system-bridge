//go:build windows

package filesystem

import (
	"os/exec"

	"github.com/timmo001/system-bridge/utils"
)

func openFile(path string) error {
	cmd := exec.Command("cmd", "/c", "start", "", path)
	utils.SetHideWindow(cmd)
	return cmd.Run()
}
