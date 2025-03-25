package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterGetSettingsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetSettings, func(message event.Message) event.MessageResponse {
		log.Infof("Received get settings event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeSettingsResult,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Got settings",
		}
	})
}
