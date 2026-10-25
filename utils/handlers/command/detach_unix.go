//go:build !windows

package command

import (
	"os/exec"
	"syscall"
)

// detachProcess starts the program in a session of its own, so it isn't
// stopped with System Bridge
func detachProcess(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
