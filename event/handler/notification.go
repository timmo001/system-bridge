package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
)

func RegisterNotificationHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventNotification, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received notification event", "message", message)

		data := notification.NotificationData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode notification event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode notification event data",
			}
		}

		// Validate notification data
		if data.Title == "" || data.Message == "" {
			slog.Error("Missing required notification data")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Missing required notification data",
			}
		}

		err = notification.Send(data)
		if err != nil {
			slog.Error("Failed to send notification", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to send notification",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeNotificationSent,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Notification sent",
		}
	})
}
