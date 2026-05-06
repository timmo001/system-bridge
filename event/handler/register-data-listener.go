package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/backend/service"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type RegisterDataListenerRequestData struct {
	Modules []types.ModuleName `json:"modules" mapstructure:"modules"`
}

func RegisterRegisterDataListenerHandler(router *event.MessageRouter, backendService *service.Service) {
	router.RegisterSimpleHandler(event.EventRegisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received register data listener event", "message", message)

		var data RegisterDataListenerRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		if err := backendService.RegisterDataListener(connection, data.Modules); err != nil {
			slog.Error("Failed to register data listener", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to register data listener",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerRegistered,
			Subtype: event.ResponseSubtypeNone,
			Data:    data,
			Message: "Listener registered",
		}
	})
}
