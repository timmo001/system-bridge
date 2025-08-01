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

func Logout() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("shutdown", "/l")
		utils.SetHideWindow(cmd)
		return cmd.Run()
	case "linux":
		cmd := exec.Command("loginctl", "terminate-user", "current")
		return cmd.Run()
	case "darwin":
		cmd := exec.Command("osascript", "-e", "tell application \"System Events\" to log out")
		return cmd.Run()
	default:
		return fmt.Errorf("logging out not supported on %s", runtime.GOOS)
	}
}

func RegisterPowerLogoutHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerLogout, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received power logout event", "message", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Logout the system
			if err := Logout(); err != nil {
				slog.Error("Failed to logout system", "error", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerLoggingout,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Logging out",
		}
	})
}
