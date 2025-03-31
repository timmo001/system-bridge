package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/keyboard"
)

func RegisterKeyboardKeypressHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardKeypress, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received keyboard keypress event: %v", message)

		data := keyboard.KeypressData{}
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

		log.Infof("Pressing keyboard key: %s with modifiers: %v", data.Key, data.Modifiers)

		err = keyboard.SendKeypress(data)
		if err != nil {
			log.Errorf("Failed to press key: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to press key",
			}
		}

		log.Debugf("Key pressed: %s with modifiers: %v", data.Key, data.Modifiers)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardKeyPressed,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard key pressed",
		}
	})
}
