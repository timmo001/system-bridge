package event_handler

import (
	"log/slog"

	"github.com/timmo001/system-bridge/backend/service"
	"github.com/timmo001/system-bridge/event"
)

func RegisterUnregisterDataListenerHandler(router *event.MessageRouter, backendService *service.Service) {
	router.RegisterSimpleHandler(event.EventUnregisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received unregister data listener event", "message", message)

		if err := backendService.UnregisterDataListener(connection); err != nil {
			slog.Error("Failed to unregister data listener", "error", err)
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "Failed to unregister data listener",
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataListenerUnregistered,
			Subtype: event.ResponseSubtypeNone,
			Message: "Listener unregistered",
		}
	})
}
