//go:build !windows

package utils

import "os/exec"

func SetHideWindow(cmd *exec.Cmd) {
	// No-op on non-Windows
}
