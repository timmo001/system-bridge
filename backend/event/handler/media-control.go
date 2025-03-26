package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/event"
)

func RegisterMediaControlHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventMediaControl, func(message event.Message) event.MessageResponse {
		log.Infof("Received media control event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeMediaControlled,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Media controlled",
		}
	})
}
