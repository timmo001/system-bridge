package event_handler

import (
	"fmt"
	"log/slog"
	"os/exec"
	"runtime"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils"
)

func Restart() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("shutdown", "/r")
		utils.SetHideWindow(cmd)
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
		slog.Info("Received power restart event", "message", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Restart the system
			if err := Restart(); err != nil {
				slog.Error("Failed to restart system", "error", err)
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
