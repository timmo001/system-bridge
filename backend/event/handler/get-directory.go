package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/backend/event"
)

type GetDirectoryRequestData struct {
	BaseDirectory string `json:"base" mapstructure:"base"`
}

func (h *MessageHandler) GetDirectory(baseDirectoryKey string) *GetDirectoriesResponseDataItem {
	// Get directories
	directories := h.GetDirectories()

	// Find the directory with the key of the base directory
	var baseDirectory *GetDirectoriesResponseDataItem = nil
	for _, directory := range directories {
		if directory.Key == baseDirectoryKey {
			baseDirectory = &directory
		}
	}

	return baseDirectory
}

func (h *MessageHandler) RegisterGetDirectoryHandler() {
	h.router.RegisterSimpleHandler(event.EventGetDirectory, func(message event.Message) event.MessageResponse {
		log.Infof("Received get directory event: %v", message)

		var data GetDirectoryRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		directory := h.GetDirectory(data.BaseDirectory)

		if directory == nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadDirectory,
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDirectory,
			Subtype: event.ResponseSubtypeNone,
			Data:    directory,
		}
	})
}

