package event_handler

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
)

type ValidateDirectoryRequestData struct {
	Path string `json:"path" mapstructure:"path"`
}

type ValidateDirectoryResponseData struct {
	Valid bool `json:"valid" mapstructure:"valid"`
}

func RegisterValidateDirectoryHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventValidateDirectory, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received validate directory event: %v", message)

		var data ValidateDirectoryRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		valid := false
		if data.Path != "" {
			cleanPath := filepath.Clean(data.Path)
			if !strings.Contains(cleanPath, "..") {
				if stat, err := os.Stat(cleanPath); err == nil && stat.IsDir() {
					valid = true
				}
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDirectoryValidated,
			Subtype: event.ResponseSubtypeNone,
			Data:    ValidateDirectoryResponseData{Valid: valid},
			Message: "Validated directory",
		}
	})
}
