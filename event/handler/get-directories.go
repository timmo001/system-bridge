package event_handler

import (
	"log/slog"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
)

func GetDirectories(router *event.MessageRouter) []filesystem.DirectoryInfo {
	directories := filesystem.GetUserDirectories()

	// Load settings to get user media directories
	s, err := settings.Load()
	if err != nil {
		slog.Error("Failed to load settings for media directories", "error", err)
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
		slog.Debug("Received get directories event", "message", message)

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
