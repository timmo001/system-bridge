package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/script"
)

func RegisterScriptExecuteHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventScriptExecute, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received script execute event", "message", message)

		// Decode request data
		var requestData struct {
			ScriptID string `json:"scriptID" mapstructure:"scriptID"`
		}
		err := mapstructure.Decode(message.Data, &requestData)
		if err != nil {
			slog.Error("Failed to decode script execute event data", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to decode script execute event data",
			}
		}

		// Validate script ID
		if requestData.ScriptID == "" {
			slog.Error("Missing script ID")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Missing script ID",
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
		executeReq := script.ExecuteRequest{
			ScriptID:   requestData.ScriptID,
			RequestID:  message.ID,
			Connection: connection,
		}

		// Execute script (async)
		err = script.Execute(executeReq, cfg)
		if err != nil {
			slog.Error("Failed to execute script", "error", err, "scriptID", requestData.ScriptID)

			// Check if it's a validation error (script not found)
			subtype := event.ResponseSubtypeNone
			if err.Error() == "script "+requestData.ScriptID+" not found in allowlist" {
				subtype = event.ResponseSubtypeScriptNotFound
			}

			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: err.Error(),
			}
		}

		// Return immediate response (script is executing asynchronously)
		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeScriptExecuting,
			Subtype: event.ResponseSubtypeNone,
			Data: map[string]string{
				"scriptID": requestData.ScriptID,
			},
			Message: "Script is executing",
		}
	})
}
