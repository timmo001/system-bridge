package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterOpenHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventOpen, func(message event.Message) event.MessageResponse {
		log.Infof("Received open event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeOpened,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Opened",
		}
	})
}
