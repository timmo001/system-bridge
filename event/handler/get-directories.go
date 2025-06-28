package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
)

func GetDirectories(router *event.MessageRouter) []filesystem.DirectoryInfo {
	directories := filesystem.GetUserDirectories()

	// Load settings to get user media directories
	s, err := settings.Load()
	if err != nil {
		log.Errorf("Failed to load settings for media directories: %v", err)
		return directories
	}

	// Get user media directories
	for _, directory := range s.Media.Directories {
		directories = append(directories, filesystem.DirectoryInfo{
			Key:  directory.Name,
			Path: directory.Path,
		})
	}

	return directories
}

func RegisterGetDirectoriesHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDirectories, func(connection string, message event.Message) event.MessageResponse {
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
