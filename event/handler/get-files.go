package event_handler

import (
	"log/slog"
	"os"
	"path/filepath"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
)

type GetFilesRequestData struct {
	BaseDirectory string `json:"base" mapstructure:"base"`
	Path          string `json:"path,omitempty" mapstructure:"path,omitempty"`
}

type GetFilesResponseData = []GetFileResponseData

func GetFiles(path string) []GetFileResponseData {
	files, err := os.ReadDir(path)
	if err != nil {
		slog.Error("Failed to read directory", "error", err)
		return nil
	}

	responseData := []GetFileResponseData{}
	for _, file := range files {
		fileInfo := GetFileInfo(path, file.Name())
		responseData = append(responseData, *fileInfo)
	}
	return responseData
}

func RegisterGetFilesHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetFiles, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received get files event", "message", message)

		var data GetFilesRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		// Get base directory
		baseDirectory := GetDirectory(router, data.BaseDirectory)
		if baseDirectory == nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadDirectory,
			}
		}

		// Validate base directory path is not empty
		if baseDirectory.Path == "" {
			slog.Error("Base directory path is empty", "base", data.BaseDirectory)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadDirectory,
				Message: "Base directory path is empty",
			}
		}

		// Get files
		var files []GetFileResponseData
		if data.Path != "" {
			files = GetFiles(filepath.Join(baseDirectory.Path, data.Path))
		} else {
			files = GetFiles(baseDirectory.Path)
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFiles,
			Subtype: event.ResponseSubtypeNone,
			Data:    files,
			Message: "Got files",
		}
	})
}
