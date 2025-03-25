package event_handler

import (
	"os"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/event"
)

type Directory struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type GetDirectoriesResponseData = []Directory

func RegisterGetDirectoriesHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetDirectories, func(message event.Message) event.MessageResponse {
		log.Infof("Received get directories event: %v", message)

		// Get desktop directory
		desktopDirectory := ""
		if os.Getenv("XDG_DESKTOP_DIR") != "" {
			desktopDirectory = os.Getenv("XDG_DESKTOP_DIR")
		} else if os.Getenv("HOME") != "" {
			desktopDirectory = os.Getenv("HOME") + "/Desktop"
		}

		// Get documents directory
		documentsDirectory := ""
		if os.Getenv("XDG_DOCUMENTS_DIR") != "" {
			documentsDirectory = os.Getenv("XDG_DOCUMENTS_DIR")
		} else if os.Getenv("HOME") != "" {
			documentsDirectory = os.Getenv("HOME") + "/Documents"
		}

		// Get downloads directory
		downloadsDirectory := ""
		if os.Getenv("XDG_DOWNLOAD_DIR") != "" {
			downloadsDirectory = os.Getenv("XDG_DOWNLOAD_DIR")
		} else if os.Getenv("HOME") != "" {
			downloadsDirectory = os.Getenv("HOME") + "/Downloads"
		}

		// Get music directory
		musicDirectory := ""
		if os.Getenv("XDG_MUSIC_DIR") != "" {
			musicDirectory = os.Getenv("XDG_MUSIC_DIR")
		} else if os.Getenv("HOME") != "" {
			musicDirectory = os.Getenv("HOME") + "/Music"
		}

		// Get pictures directory
		picturesDirectory := ""
		if os.Getenv("XDG_PICTURES_DIR") != "" {
			picturesDirectory = os.Getenv("XDG_PICTURES_DIR")
		} else if os.Getenv("HOME") != "" {
			picturesDirectory = os.Getenv("HOME") + "/Pictures"
		}

		// Get videos directory
		videosDirectory := ""
		if os.Getenv("XDG_VIDEOS_DIR") != "" {
			videosDirectory = os.Getenv("XDG_VIDEOS_DIR")
		} else if os.Getenv("HOME") != "" {
			videosDirectory = os.Getenv("HOME") + "/Videos"
		}

		responseData := GetDirectoriesResponseData{
			{
				Name: "Desktop",
				Path: desktopDirectory,
			},
			{
				Name: "Documents",
				Path: documentsDirectory,
			},
			{
				Name: "Downloads",
				Path: downloadsDirectory,
			},
			{
				Name: "Music",
				Path: musicDirectory,
			},
			{
				Name: "Pictures",
				Path: picturesDirectory,
			},
			{
				Name: "Videos",
				Path: videosDirectory,
			},
		}

		// Get user media directories
		for _, directory := range router.Settings.Media.Directories {
			responseData = append(responseData, Directory{
				Name: directory.Name,
				Path: directory.Path,
			})
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDirectories,
			Subtype: event.ResponseSubtypeNone,
			Data:    responseData,
			Message: "Got directories",
		}
	})
}
