package event_handler

import (
	"time"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/power"
)

func RegisterPowerShutdownHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerShutdown, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received power shutdown event: %v", message)

		go func() {
			time.Sleep(1 * time.Second)

			// Shutdown the system
			if err := power.Shutdown(); err != nil {
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
