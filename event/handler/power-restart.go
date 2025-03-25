package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterPowerRestartHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerRestart, func(message event.Message) event.MessageResponse {
		log.Infof("Received power restart event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerRestarting,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Restarting",
		}
	})
}
