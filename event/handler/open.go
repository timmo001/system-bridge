package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/pkg/browser"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
)

type OpenRequestData struct {
	Path string `json:"path" mapstructure:"path"`
	URL  string `json:"url" mapstructure:"url"`
}

func RegisterOpenHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventOpen, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received open event", "message", message)

		data := OpenRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode open event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode open event data",
			}
		}

		// Validate path data
		if data.Path == "" && data.URL == "" {
			slog.Error("No path or URL provided for open")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No path or URL provided for open",
			}
		}

		if data.Path != "" {
			err = filesystem.OpenFile(data.Path)
			if err != nil {
				slog.Error("Failed to open file", "error", err)
				return event.MessageResponse{
					ID:      message.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeNone,
					Message: "Failed to open file",
				}
			}

			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeOpened,
				Subtype: event.ResponseSubtypeNone,
				Data:    message.Data,
				Message: "Opened file",
			}
		} else if data.URL != "" {
			// Open the URL in the default browser
			err := browser.OpenURL(data.URL)
			if err != nil {
				slog.Error("Failed to open URL", "error", err)
				return event.MessageResponse{
					ID:      message.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeNone,
					Message: "Failed to open URL",
				}
			}
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeOpened,
				Subtype: event.ResponseSubtypeNone,
				Data:    message.Data,
				Message: "Opened URL",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeError,
			Subtype: event.ResponseSubtypeBadRequest,
			Message: "No path or URL provided for open",
		}
	})
}
