package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/event"
)

func RegisterRegisterDataListenerHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventRegisterDataListener, func(message event.Message) event.MessageResponse {
		log.Infof("Received register data listener event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerRegistered,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Listener registered",
		}
	})
}
