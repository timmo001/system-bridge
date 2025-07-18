package event_handler

import (
	"log/slog"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/keyboard"
)

type KeyboardTextRequestData struct {
	Text  string `json:"text" mapstructure:"text"`
	Delay int    `json:"delay" mapstructure:"delay"`
}

func RegisterKeyboardTextHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardText, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received keyboard text event", "message", message)

		data := KeyboardTextRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode keyboard text event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode keyboard text event data",
			}
		}

		// Validate text data
		if data.Text == "" {
			slog.Error("No text provided for keyboard text event")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No text provided for keyboard text event",
			}
		}

		// Use provided delay
		if data.Delay > 0 {
			delay := data.Delay

			slog.Info("Waiting before typing", "delay_ms", delay)
			time.Sleep(time.Duration(delay) * time.Millisecond)
		}

		slog.Info("Typing text", "text", data.Text)
		// Type the text
		err = keyboard.SendText(data.Text)
		if err != nil {
			slog.Error("Failed to type text", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to type text",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardTextSent,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard text sent",
		}
	})
}
