package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/keyboard"
)

func RegisterKeyboardKeypressHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardKeypress, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received keyboard keypress event", "message", message)

		data := keyboard.KeypressData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode keyboard keypress event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode keyboard keypress event data",
			}
		}

		// Validate key data
		if data.Key == "" {
			slog.Error("No key provided for keyboard keypress")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No key provided for keyboard keypress",
			}
		}

		slog.Info("Pressing keyboard key", "key", data.Key, "modifiers", data.Modifiers)

		err = keyboard.SendKeypress(data)
		if err != nil {
			slog.Error("Failed to press key", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to press key",
			}
		}

		slog.Debug("Key pressed", "key", data.Key, "modifiers", data.Modifiers)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardKeyPressed,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard key pressed",
		}
	})
}
