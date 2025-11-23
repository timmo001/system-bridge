package event_handler

import (
	"errors"
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/command"
)

func RegisterCommandExecuteHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventCommandExecute, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received command execute event", "message", message)

		// Decode request data
		var requestData struct {
			CommandID string `json:"commandID" mapstructure:"commandID"`
		}
		err := mapstructure.Decode(message.Data, &requestData)
		if err != nil {
			slog.Error("Failed to decode command execute event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode command execute event data",
			}
		}

		// Validate command ID
		if requestData.CommandID == "" {
			slog.Error("Missing command ID")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Missing command ID",
			}
		}

		// Load settings
		cfg, err := settings.Load()
		if err != nil {
			slog.Error("Failed to load settings", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to load settings",
			}
		}

		// Create execute request
		executeReq := command.ExecuteRequest{
			CommandID:  requestData.CommandID,
			RequestID:  message.ID,
			Connection: connection,
		}

		// Execute command (async)
		err = command.Execute(executeReq, cfg)
		if err != nil {
			slog.Error("Failed to execute command", "error", err, "commandID", requestData.CommandID)

			// Check error type using typed errors
			subtype := event.ResponseSubtypeNone
			if errors.Is(err, command.ErrCommandNotFound) {
				subtype = event.ResponseSubtypeCommandNotFound
			} else if errors.Is(err, command.ErrCommandPathInvalid) {
				subtype = event.ResponseSubtypeBadPath
			} else if errors.Is(err, command.ErrWorkingDirInvalid) {
				subtype = event.ResponseSubtypeBadDirectory
			} else if errors.Is(err, command.ErrCommandEmpty) {
				subtype = event.ResponseSubtypeBadRequest
			}

			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: err.Error(),
			}
		}

		// Return immediate response (command is executing asynchronously)
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeCommandExecuting,
			Subtype: event.ResponseSubtypeNone,
			Data: map[string]string{
				"commandID": requestData.CommandID,
			},
			Message: "Command is executing",
		}
	})
}
