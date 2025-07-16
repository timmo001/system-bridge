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

func Hibernate() error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command("shutdown", "/h")
		utils.SetHideWindow(cmd)
		return cmd.Run()
	case "linux":
		// Try systemd first
		cmd := exec.Command("systemctl", "hibernate")
		if err := cmd.Run(); err != nil {
			// Fallback to pm-utils if systemd fails
			cmd = exec.Command("pm-hibernate")
			return cmd.Run()
		}
		return nil
	case "darwin":
		cmd := exec.Command("pmset", "sleepnow")
		return cmd.Run()
	default:
		return fmt.Errorf("hibernation not supported on %s", runtime.GOOS)
	}
}

func RegisterPowerHibernateHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerHibernate, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received power hibernate event: %v", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Hibernate the system
			if err := Hibernate(); err != nil {
				log.Errorf("Failed to hibernate system: %v", err)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerHibernating,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Hibernating",
		}
	})
}
