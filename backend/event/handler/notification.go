package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/event"
)

func RegisterNotificationHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventNotification, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received notification event: %v", message)

		// TODO: Implement
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeNotificationSent,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Notification sent",
		}
	})
}
