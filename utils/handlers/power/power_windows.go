//go:build windows
// +build windows

package power

import (
	"os/exec"
	"syscall"
)

func shutdown() error {
	cmd := exec.Command("shutdown", "/s")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func restart() error {
	cmd := exec.Command("shutdown", "/r")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func sleep() error {
	cmd := exec.Command("powercfg", "-hibernate", "off")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err != nil {
		return err
	}
	cmd = exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func hibernate() error {
	cmd := exec.Command("powercfg", "-hibernate", "on")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if err := cmd.Run(); err != nil {
		return err
	}
	cmd = exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "1,1,0")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func lock() error {
	cmd := exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}

func logout() error {
	cmd := exec.Command("shutdown", "/l")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Run()
}
