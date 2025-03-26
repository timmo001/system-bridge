package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	data_module "github.com/timmo001/system-bridge/backend/data/module"
	"github.com/timmo001/system-bridge/backend/event"
	"github.com/timmo001/system-bridge/backend/websocket"
)

type GetDataRequestData struct {
	Modules []data_module.ModuleName `json:"modules" mapstructure:"modules"`
}

type GetDataResponseData = any

func RegisterGetDataHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetData, func(connection string, message event.Message) event.MessageResponse {
		log.Infof("Received get data event: %v", message)

		var data GetDataRequestData
		if err := mapstructure.Decode(message.Data, &data); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		go func() {
			// Get the websocket instance
			ws := websocket.GetInstance()
			if ws == nil {
				log.Error("No websocket instance found")
				return
			}

			// Register the data listener
			response := ws.RegisterDataListener(connection, data.Modules)
			if response == websocket.RegisterResponseExists {
				log.Infof("Data listener already exists for %s", connection)
			}

			for _, module := range data.Modules {
				ws.BroadcastModuleUpdate(connection, *router.DataStore.GetModule(module))
			}

			// Unregister the data listener if they have not already registered
			if response == websocket.RegisterResponseAdded {
				ws.UnregisterDataListener(connection)
			}
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeGettingData,
			Subtype: event.ResponseSubtypeNone,
			Data:    data,
			Message: "Getting data",
		}
	})
}
