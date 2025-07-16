//go:build windows
// +build windows

package utils

import (
	"os/exec"
	"syscall"
)

func SetHideWindow(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
