package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterGetFileHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetFile, func(message event.Message) event.MessageResponse {
		log.Infof("Received get file event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFile,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Got file",
		}
	})
}
