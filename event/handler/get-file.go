package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/filesystem"
)

type GetFileRequestData struct {
	Path string `json:"path" mapstructure:"path"`
}

func RegisterGetFileHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetFile, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received get file event", "message", message)

		data := GetFileRequestData{}
		err := mapstructure.Decode(message.Data, &data)
		if err != nil {
			slog.Error("Failed to decode get file event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode get file event data",
			}
		}

		// Validate path data
		if data.Path == "" {
			slog.Error("No path provided for get file")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "No path provided for get file",
			}
		}

		fileInfo, err := filesystem.GetFileInfo(data.Path)
		if err != nil {
			slog.Error("Failed to get file info", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to get file info",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeFile,
			Subtype: event.ResponseSubtypeNone,
			Data:    fileInfo,
			Message: "Got file info",
		}
	})
}
