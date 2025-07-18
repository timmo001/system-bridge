package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/media"
)

type MediaControlRequestData struct {
	Action string `json:"action" mapstructure:"action"`
}

func RegisterMediaControlHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventMediaControl, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received media control event", "message", message)

		data := MediaControlRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode media control event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode media control event data",
			}
		}

		// Validate action data
		if data.Action == "" {
			slog.Error("No action provided for media control")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No action provided for media control",
			}
		}

		err = media.Control(media.MediaAction(data.Action))
		if err != nil {
			slog.Error("Failed to control media", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to control media",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeMediaControlled,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Media controlled",
		}
	})
}
