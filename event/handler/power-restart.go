package event_handler

import (
	"fmt"
	"os/exec"
	"runtime"
	"time"

	"syscall"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func Restart() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("shutdown", "/r")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		return cmd.Run()
	case "linux":
		cmd := exec.Command("systemctl", "reboot")
		return cmd.Run()
	case "darwin":
		cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to restart")
		return cmd.Run()
	default:
		return fmt.Errorf("restarting not supported on %s", runtime.GOOS)
	}
}

func RegisterPowerRestartHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerRestart, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received power restart event: %v", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Restart the system
			if err := Restart(); err != nil {
				log.Errorf("Failed to restart system: %v", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerRestarting,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Restarting",
		}
	})
}
