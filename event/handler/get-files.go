package event_handler

import (
	"os"
	"path/filepath"

	"github.com/charmbracelet/log"
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
		log.Errorf("Failed to read directory: %v", err)
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
	router.RegisterSimpleHandler(event.EventGetFiles, func(message event.Message) event.MessageResponse {
		log.Infof("Received get files event: %v", message)

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
