package event_handler

import (
	"time"

	"github.com/charmbracelet/log"
	"github.com/go-vgo/robotgo"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/backend/event"
)

type KeyboardTextRequestData struct {
	Text  string `json:"text" mapstructure:"text"`
	Delay int    `json:"delay" mapstructure:"delay"`
}

func RegisterKeyboardTextHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardText, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received keyboard text event: %v", message)

		data := KeyboardTextRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			log.Errorf("Failed to decode keyboard text event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode keyboard text event data",
			}
		}

		// Validate text data
		if data.Text == "" {
			log.Error("No text provided for keyboard text event")
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

			log.Infof("Waiting for %d milliseconds", delay)
			time.Sleep(time.Duration(delay) * time.Millisecond)
		}

		log.Infof("Typing text: %s", data.Text)
		// Type the text
		robotgo.TypeStr(data.Text)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardTextSent,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard text sent",
		}
	})
}
