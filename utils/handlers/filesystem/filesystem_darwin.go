//go:build darwin

package filesystem

import (
	"os/exec"
)

func openFile(path string) error {
	cmd := exec.Command("open", path)
	return cmd.Run()
}
