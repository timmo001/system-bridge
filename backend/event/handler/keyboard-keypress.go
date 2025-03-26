package event_handler

import (
	"strings"
	"time"

	"github.com/charmbracelet/log"
	"github.com/go-vgo/robotgo"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/backend/event"
)

type KeyboardKeypressRequestData struct {
	Key       string   `json:"key" mapstructure:"key"`
	Modifiers []string `json:"modifiers" mapstructure:"modifiers"`
	Delay     int      `json:"delay" mapstructure:"delay"` // Delay in milliseconds
}

func RegisterKeyboardKeypressHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventKeyboardKeypress, func(connection string, message event.Message) event.MessageResponse {
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

		// Use provided delay
		if data.Delay > 0 {
			delay := data.Delay

			log.Infof("Waiting for %d milliseconds", delay)
			time.Sleep(time.Duration(delay) * time.Millisecond)
		}

		log.Infof("Pressing keyboard key: %s with modifiers: %v", data.Key, data.Modifiers)

		// Convert modifiers to robotgo format
		var modifiers []interface{}
		for _, mod := range data.Modifiers {
			mod = strings.ToLower(mod)
			switch mod {
			case "shift":
				modifiers = append(modifiers, "shift")
			case "ctrl", "control":
				modifiers = append(modifiers, "ctrl")
			case "alt":
				modifiers = append(modifiers, "alt")
			case "cmd", "command":
				modifiers = append(modifiers, "cmd")
			default:
				log.Warnf("Unsupported modifier: %s", mod)
			}
		}

		if len(modifiers) > 0 {
			err = robotgo.KeyTap(data.Key, modifiers...)
		} else {
			err = robotgo.KeyTap(data.Key)
		}

		if err != nil {
			log.Errorf("Failed to press key: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to press key",
			}
		}

		log.Debugf("Key pressed: %s with modifiers: %v", data.Key, modifiers)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeKeyboardKeyPressed,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Keyboard key pressed",
		}
	})
}
