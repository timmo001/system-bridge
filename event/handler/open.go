package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
)

type OpenRequestData struct {
	Path string `json:"path" mapstructure:"path"`
}

func RegisterOpenHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventOpen, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received open event: %v", message)

		data := OpenRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			log.Errorf("Failed to decode open event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode open event data",
			}
		}

		// Validate path data
		if data.Path == "" {
			log.Error("No path provided for open")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No path provided for open",
			}
		}

		err = filesystem.OpenFile(data.Path)
		if err != nil {
			log.Errorf("Failed to open file: %v", err)
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
	})
}
