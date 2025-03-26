package event_handler

import (
	"fmt"
	"os/exec"
	"runtime"
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/event"
)

func Shutdown() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("shutdown", "/s")
		return cmd.Run()
	case "linux":
		cmd := exec.Command("systemctl", "poweroff")
		return cmd.Run()
	case "darwin":
		cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to shut down")
		return cmd.Run()
	default:
		return fmt.Errorf("shutting down not supported on %s", runtime.GOOS)
	}
}

func RegisterPowerShutdownHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerShutdown, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received power shutdown event: %v", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Shutdown the system
			if err := Shutdown(); err != nil {
				log.Errorf("Failed to shutdown system: %v", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerShuttingdown,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Shutting down",
		}
	})
}
