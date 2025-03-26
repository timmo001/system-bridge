package event_handler

import (
	"runtime"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

type GetDirectoriesResponseDataItem struct {
	Key  string `json:"key" mapstructure:"key"`
	Path string `json:"path" mapstructure:"path"`
}

type GetDirectoriesResponseData = []GetDirectoriesResponseDataItem

func GetDirectories(router *event.MessageRouter) GetDirectoriesResponseData {
	var desktopDirectory, documentsDirectory, downloadsDirectory, musicDirectory, picturesDirectory, videosDirectory string

	switch runtime.GOOS {
	case "windows":
		desktopDirectory, documentsDirectory, downloadsDirectory, musicDirectory, picturesDirectory, videosDirectory = GetWindowsDirectories()
	case "linux", "darwin":
		desktopDirectory, documentsDirectory, downloadsDirectory, musicDirectory, picturesDirectory, videosDirectory = GetUnixDirectories()
	}

	directories := GetDirectoriesResponseData{
		{
			Key:  "desktop",
			Path: desktopDirectory,
		},
		{
			Key:  "documents",
			Path: documentsDirectory,
		},
		{
			Key:  "downloads",
			Path: downloadsDirectory,
		},
		{
			Key:  "music",
			Path: musicDirectory,
		},
		{
			Key:  "pictures",
			Path: picturesDirectory,
		},
		{
			Key:  "videos",
			Path: videosDirectory,
		},
	}

	// Get user media directories
	for _, directory := range router.Settings.Media.Directories {
		directories = append(directories, GetDirectoriesResponseDataItem{
			Key:  directory.Name,
			Path: directory.Path,
		})
	}

	return directories
}

func RegisterGetDirectoriesHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDirectories, func(message event.Message) event.MessageResponse {
		log.Infof("Received get directories event: %v", message)

		directories := GetDirectories(router)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDirectories,
			Subtype: event.ResponseSubtypeNone,
			Data:    directories,
			Message: "Got directories",
		}
	})
}
