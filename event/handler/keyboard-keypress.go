package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/go-vgo/robotgo"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
)

type KeyboardKeypressRequestData struct {
	Key string `json:"key" mapstructure:"key"`
}

func RegisterKeyboardKeypressHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardKeypress, func(message event.Message) event.MessageResponse {
		log.Infof("Received keyboard keypress event: %v", message)

		data := KeyboardKeypressRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			log.Errorf("Failed to decode keyboard keypress event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode keyboard keypress event data",
			}
		}

		// Validate key data
		if data.Key == "" {
			log.Error("No key provided for keyboard keypress")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No key provided for keyboard keypress",
			}
		}

		// Simulate the key press
		log.Infof("Pressing keyboard key: %s", data.Key)

		// Use robotgo to simulate the key press
		err = robotgo.KeyTap(data.Key)
		if err != nil {
			log.Errorf("Failed to press key: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to press key",
			}
		}

		log.Debugf("Key pressed: %s", data.Key)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardKeyPressed,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard key pressed",
		}
	})
}
