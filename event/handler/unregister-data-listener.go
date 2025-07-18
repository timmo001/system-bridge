package event_handler

import (
	"log/slog"

	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
)

func RegisterUnregisterDataListenerHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUnregisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		slog.Info("Received unregister data listener event", "message", message)

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

		ws.UnregisterDataListener(connection)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerUnregistered,
			Subtype: event.ResponseSubtypeNone,
			Message: "Listener unregistered",
		}
	})
}
