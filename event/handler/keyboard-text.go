package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

func RegisterKeyboardTextHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardText, func(message event.Message) event.MessageResponse {
		log.Infof("Received keyboard text event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardTextSent,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard text sent",
		}
	})
}
