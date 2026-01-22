package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/bus"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type GetDataRequestData struct {
	Modules []types.ModuleName `json:"modules" mapstructure:"modules"`
}

type GetDataResponseData = any

func RegisterGetDataHandler(router *event.MessageRouter) {
	router.RegisterSimpleHandler(event.EventGetData, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received get data event", "message", message)

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
			bus.GetInstance().Publish(bus.Event{
				Type: bus.EventGetDataModule,
				Data: bus.GetDataRequest{
					Connection: connection,
					Modules:    data.Modules,
				},
			})
		}()

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeDataGet,
			Subtype: event.ResponseSubtypeNone,
			Data:    data,
			Message: "Getting data",
		}
	})
}
