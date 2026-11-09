//go:build linux

package filesystem

import (
	"os/exec"
)

func openFile(path string) error {
	cmd := exec.Command("xdg-open", path)
	return cmd.Start()
}
