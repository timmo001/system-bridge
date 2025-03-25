package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterPowerShutdownHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerShutdown, func(message event.Message) event.MessageResponse {
		log.Infof("Received power shutdown event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerShuttingdown,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Shutting down",
		}
	})
}
