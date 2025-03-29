package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
)

type GetFileRequestData struct {
	Path string `json:"path" mapstructure:"path"`
}

func RegisterGetFileHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetFile, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received get file event: %v", message)

		data := GetFileRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			log.Errorf("Failed to decode get file event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode get file event data",
			}
		}

		// Validate path data
		if data.Path == "" {
			log.Error("No path provided for get file")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No path provided for get file",
			}
		}

		fileInfo, err := filesystem.GetFileInfo(data.Path)
		if err != nil {
			log.Errorf("Failed to get file info: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to get file info",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFile,
			Subtype: event.ResponseSubtypeNone,
			Data:    fileInfo,
			Message: "Got file info",
		}
	})
}
