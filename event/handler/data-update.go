package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterDataUpdateHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventDataUpdate, func(message event.Message) event.MessageResponse {
		log.Infof("Received data update event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataUpdate,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Data updated",
		}
	})
}
