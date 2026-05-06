package event_handler

import (
	"log/slog"

	"github.com/timmo001/system-bridge/event"
)

func RegisterUnregisterDataListenerHandler(router *event.MessageRouter, listeners DataListenerRegistry) {
	router.RegisterSimpleHandler(event.EventUnregisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received unregister data listener event", "message", message)

		if listeners == nil {
			slog.Error("No websocket instance found")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "No websocket instance found",
			}
		}

		listeners.UnregisterDataListener(connection)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerUnregistered,
			Subtype: event.ResponseSubtypeNone,
			Message: "Listener unregistered",
		}
	})
}
