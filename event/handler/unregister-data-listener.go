package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
)

func RegisterUnregisterDataListenerHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventUnregisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received unregister data listener event: %v", message)

		ws := websocket.GetInstance()
		if ws == nil {
			log.Error("No websocket instance found")
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeNone,
				Message: "No websocket instance found",
			}
		}

		ws.UnregisterDataListener(connection)

		return event.MessageResponse{
			ID:   message.ID,
			Type: event.ResponseTypeDataListenerUnregistered,
		}
	})
}
