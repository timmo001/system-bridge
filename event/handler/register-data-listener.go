package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type RegisterDataListenerRequestData struct {
	Modules []types.ModuleName `json:"modules" mapstructure:"modules"`
}

func RegisterRegisterDataListenerHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventRegisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received register data listener event", "message", message)

		var data RegisterDataListenerRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		ws := websocket.GetInstance()
		if ws == nil {
			slog.Error("No websocket instance found")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "No websocket instance found",
			}
		}

		ws.RegisterDataListener(connection, data.Modules)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerRegistered,
			Subtype: event.ResponseSubtypeNone,
			Data:    data,
			Message: "Listener registered",
		}
	})
}
