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

func Sleep() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("rundll32.exe", "powrprof.dll,SetSuspendState")
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
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
		log.Infof("Received power sleep event: %v", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Sleep the system
			if err := Sleep(); err != nil {
				log.Errorf("Failed to sleep system: %v", err)
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
