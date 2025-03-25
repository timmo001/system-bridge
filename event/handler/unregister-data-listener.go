package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterUnregisterDataListenerHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUnregisterDataListener, func(message event.Message) event.MessageResponse {
		log.Infof("Received unregister data listener event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerUnregistered,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Listener unregistered",
		}
	})
}
