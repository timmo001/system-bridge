package event_handler

import (
	"os"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

type GetFilesRequestData struct {
	BaseDirectory string `json:"base"`
	Path          string `json:"path,omitempty"`
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

		data := message.Data.(GetFilesRequestData)

		// Get directory
		directory := GetDirectory(router, data.BaseDirectory)
		if directory == nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadDirectory,
			}
		}

		// Get files
		files := GetFiles(directory.Path)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFiles,
			Subtype: event.ResponseSubtypeNone,
			Data:    files,
			Message: "Got files",
		}
	})
}
