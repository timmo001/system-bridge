package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
)

type GetDirectoryRequestData struct {
	BaseDirectory string `json:"base" mapstructure:"base"`
}

func GetDirectory(router *event.MessageRouter, baseDirectoryKey string) *GetDirectoriesResponseDataItem {
	// Get directories
	directories := GetDirectories(router)

	// Find the directory with the key of the base directory
	for _, directory := range directories {
		if directory.Key == baseDirectoryKey {
			return &GetDirectoriesResponseDataItem{
				Key:  directory.Key,
				Name: directory.Key, // Using Key as Name since DirectoryInfo doesn't have a Name field
				Path: directory.Path,
			}
		}
	}

	return nil
}

func RegisterGetDirectoryHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDirectory, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received get directory event", "message", message)

		var data GetDirectoryRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		directory := GetDirectory(router, data.BaseDirectory)

		if directory == nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadDirectory,
				Message: "Failed to get directory",
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
