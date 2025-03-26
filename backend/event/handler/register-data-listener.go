package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	data_module "github.com/timmo001/system-bridge/backend/data/module"
	"github.com/timmo001/system-bridge/backend/event"
	"github.com/timmo001/system-bridge/backend/websocket"
)

type RegisterDataListenerRequestData struct {
	Modules []data_module.ModuleName `json:"modules" mapstructure:"modules"`
}

func RegisterRegisterDataListenerHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventRegisterDataListener, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received register data listener event: %v", message)

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
			log.Error("No websocket instance found")
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
