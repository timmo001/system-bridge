package event_handler

import (
	"github.com/charmbracelet/log"
	"github.com/mitchellh/mapstructure"
	data_module "github.com/timmo001/system-bridge/backend/data/module"
	"github.com/timmo001/system-bridge/backend/event"
)

type GetDataRequestData struct {
	Module data_module.ModuleName `json:"module" mapstructure:"module"`
}

type GetDataResponseData = any

func (h *MessageHandler) RegisterGetDataHandler() {
	h.router.RegisterSimpleHandler(event.EventGetData, func(message event.Message) event.MessageResponse {
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
			h.router.Websocket.SendMessage(message.Conn, event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeDataUpdate,
				Subtype: event.ResponseSubtypeNone,
				Data:    h.router.DataStore.GetModuleData(data.Module),
				Message: "Data updated",
			})
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
