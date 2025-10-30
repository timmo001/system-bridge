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

func restart() error {
	cmd := exec.Command("shutdown", "/r")
	utils.SetHideWindow(cmd)
	return cmd.Run()
}

func sleep() error {
	cmd := exec.Command("powercfg", "-hibernate", "off")
	utils.SetHideWindow(cmd)
	if err := cmd.Run(); err != nil {
		return err
	}
	cmd = exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0")
	utils.SetHideWindow(cmd)
	return cmd.Run()
}

func hibernate() error {
	cmd := exec.Command("powercfg", "-hibernate", "on")
	utils.SetHideWindow(cmd)
	if err := cmd.Run(); err != nil {
		return err
	}
	cmd = exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState", "1,1,0")
	utils.SetHideWindow(cmd)
	return cmd.Run()
}

func lock() error {
	cmd := exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
	utils.SetHideWindow(cmd)
	return cmd.Run()
}

func logout() error {
	cmd := exec.Command("shutdown", "/l")
	utils.SetHideWindow(cmd)
	return cmd.Run()
}
