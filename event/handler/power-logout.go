package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterPowerLogoutHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventPowerLogout, func(message event.Message) event.MessageResponse {
		log.Infof("Received power logout event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypePowerLoggingout,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Logging out",
		}
	})
}
