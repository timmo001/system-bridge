package event_handler

import (
	"log/slog"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/command/prefab"
)

func RegisterGetCommandPrefabsHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetCommandPrefabs, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received get command prefabs event", "message", message)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeCommandPrefabs,
			Subtype: event.ResponseSubtypeNone,
			Data:    prefab.List(),
			Message: "Got command prefabs",
		}
	})
}
