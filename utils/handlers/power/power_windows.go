//go:build windows
// +build windows

package power

import (
	"os/exec"
)

func shutdown() error {
	cmd := exec.Command("shutdown", "/s")
	return cmd.Run()
}

func restart() error {
	cmd := exec.Command("shutdown", "/r")
	return cmd.Run()
}

func sleep() error {
	cmd := exec.Command("powercfg", "-hibernate", "off")
	if err := cmd.Run(); err != nil {
		return err
	}
	cmd = exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0")
	return cmd.Run()
}

func hibernate() error {
	cmd := exec.Command("powercfg", "-hibernate", "on")
	if err := cmd.Run(); err != nil {
		return err
	}
	cmd = exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "1,1,0")
	return cmd.Run()
}

func lock() error {
	cmd := exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
	return cmd.Run()
}

func logout() error {
	cmd := exec.Command("shutdown", "/l")
	return cmd.Run()
}
