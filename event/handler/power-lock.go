package event_handler

import (
	"fmt"
	"os/exec"
	"runtime"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils"
)

func Lock() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("rundll32.exe", "user32.dll,LockWorkStation")
		utils.SetHideWindow(cmd)
		return cmd.Run()
	case "linux":
		// Try Wayland first with loginctl
		cmd := exec.Command("loginctl", "lock-session")
		if err := cmd.Run(); err == nil {
			return nil
		}

		// If Wayland fails, try X11
		cmd = exec.Command("xscreensaver-command", "-lock")
		if err := cmd.Run(); err == nil {
			return nil
		}

		// If xscreensaver fails, try xlock as last resort
		cmd = exec.Command("xlock")
		return cmd.Run()
	case "darwin":
		cmd := exec.Command("pmset", "displaysleepnow")
		return cmd.Run()
	default:
		return fmt.Errorf("locking not supported on %s", runtime.GOOS)
	}
}

func RegisterPowerLockHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerLock, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received power lock event: %v", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Lock the system
			if err := Lock(); err != nil {
				log.Errorf("Failed to lock system: %v", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerLocking,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Locking",
		}
	})
}
