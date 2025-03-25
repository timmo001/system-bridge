package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterGetDataHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetData, func(message event.Message) event.MessageResponse {
		log.Infof("Received get data event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeGettingData,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Data updated",
		}
	})
}
