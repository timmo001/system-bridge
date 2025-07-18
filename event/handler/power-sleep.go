package event_handler

import (
	"fmt"
	"os/exec"
	"runtime"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils"
)

func Sleep() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState")
		utils.SetHideWindow(cmd)
		return cmd.Run()
	case "linux":
		cmd := exec.Command("systemctl", "suspend")
		return cmd.Run()
	case "darwin":
		cmd := exec.Command("pmset", "sleepnow")
		return cmd.Run()
	default:
		return fmt.Errorf("sleeping not supported on %s", runtime.GOOS)
	}
}

func RegisterPowerSleepHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerSleep, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received power sleep event", "message", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Sleep the system
			if err := Sleep(); err != nil {
				slog.Error("Failed to sleep system", "err", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerSleeping,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Sleeping",
		}
	})
}
