package event_handler

import (
	"context"
	"log/slog"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/notification"
)

const notificationTimeout = 10 * time.Second

// maxNotificationButtons is as many buttons as notification daemons show
const maxNotificationButtons = 3

type NotificationDismissRequestData struct {
	// The id NOTIFICATION_SENT replied with
	ID uint32 `json:"id" mapstructure:"id"`
}

// NotificationEventData is sent to every client when a notification
// System Bridge sent is clicked or closes
type NotificationEventData struct {
	ID uint32 `json:"id"`
	// The button's id, or default for the notification itself
	Action string `json:"action,omitempty"`
	// expired, dismissed or closed
	Reason string `json:"reason,omitempty"`
}

func RegisterNotificationHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventNotification, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received notification event", "message", message)

		errorResponse := func(subtype event.ResponseSubtype, msg string) event.MessageResponse {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: msg,
			}
		}

		data := notification.NotificationData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode notification event data", "error", err)
			return errorResponse(event.ResponseSubtypeNone, "Failed to decode notification event data")
		}

		// Validate notification data
		if data.Title == "" || data.Message == "" {
			slog.Error("Missing required notification data")
			return errorResponse(event.ResponseSubtypeBadRequest, "Missing required notification data")
		}
		switch data.Urgency {
		case "", "low", "normal", "critical":
		default:
			return errorResponse(event.ResponseSubtypeBadRequest, "Urgency must be low, normal or critical")
		}
		if len(data.Buttons) > maxNotificationButtons {
			return errorResponse(event.ResponseSubtypeBadRequest, "A notification can have up to 3 buttons")
		}
		for _, button := range data.Buttons {
			if button.ID == "" || button.Label == "" || button.ID == notification.DefaultAction {
				return errorResponse(event.ResponseSubtypeBadRequest, "Each button needs an id, other than default, and a label")
			}
		}

		id, err := notification.SendWithID(data)
		if err != nil {
			slog.Error("Failed to send notification", "error", err)
			return errorResponse(event.ResponseSubtypeNone, "Failed to send notification")
		}

		// Reply with what was sent, and the id to dismiss it or match its
		// events with
		reply := map[string]any{}
		if sent, ok := message.Data.(map[string]any); ok {
			for key, value := range sent {
				reply[key] = value
			}
		}
		reply["id"] = id

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeNotificationSent,
			Subtype: event.ResponseSubtypeNone,
			Data:    reply,
			Message: "Notification sent",
		}
	})

	registerAction(router, nil, "", notificationTimeout, event.EventNotificationDismiss, event.ResponseTypeNotificationDismissed, "Notification dismissed",
		func(request NotificationDismissRequestData) string {
			if request.ID == 0 {
				return "No notification id provided"
			}
			return ""
		},
		func(_ context.Context, request NotificationDismissRequestData) error {
			return notification.Dismiss(request.ID)
		})
}

// NotificationEventResponse is the message sent to clients when a
// notification is clicked or closes
func NotificationEventResponse(e notification.Event) event.MessageResponse {
	responseType := event.ResponseTypeNotificationAction
	if e.Action == "" {
		responseType = event.ResponseTypeNotificationClosed
	}
	return event.MessageResponse{
		ID:      "system",
		Type:    responseType,
		Subtype: event.ResponseSubtypeNone,
		Data:    NotificationEventData{ID: e.ID, Action: e.Action, Reason: e.Reason},
	}
}
