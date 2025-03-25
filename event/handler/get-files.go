package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterGetFilesHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetFiles, func(message event.Message) event.MessageResponse {
		log.Infof("Received get files event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFiles,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Got files",
		}
	})
}
