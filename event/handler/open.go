package event_handler

import (
	"os"
	"os/exec"
	"runtime"

	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
)

type OpenRequestData struct {
	// Path or URL, never both
	Path string `json:"path" mapstructure:"path"`
	URL  string `json:"url" mapstructure:"url"`
}

func OpenWithDefaultProgram(path string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default: // linux and others
		cmd = exec.Command("xdg-open", path)
	}

	return cmd.Start()
}

func OpenWithDefaultBrowser(url string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default: // linux and others
		cmd = exec.Command("xdg-open", url)
	}

	return cmd.Start()
}

func RegisterOpenHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventOpen, func(message event.Message) event.MessageResponse {
		log.Infof("Received open event: %v", message)

		data := OpenRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			log.Errorf("Failed to decode open event data: %v", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode open event data",
			}
		}

		// Validate data
		if data.URL == "" && data.Path == "" {
			log.Error("No URL or path provided for open event")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No URL or path provided for open event",
			}
		}

		if data.Path != "" {
			// Check if file exists
			if _, err := os.Stat(data.Path); os.IsNotExist(err) {
				log.Errorf("File does not exist: %v", data.Path)
				return event.MessageResponse{
					ID:      message.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeBadFile,
					Message: "File does not exist",
				}
			}

			// Open the path using the default program
			if err := OpenWithDefaultProgram(data.Path); err != nil {
				log.Errorf("Failed to open file: %v", err)
				return event.MessageResponse{
					ID:      message.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeNone,
					Message: "Failed to open file",
				}
			}
		} else if data.URL != "" {
			// Open the URL using the default browser
			if err := OpenWithDefaultBrowser(data.URL); err != nil {
				log.Errorf("Failed to open URL: %v", err)
				return event.MessageResponse{
					ID:      message.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeNone,
					Message: "Failed to open URL",
				}
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeOpened,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: "Opened",
		}
	})
}
