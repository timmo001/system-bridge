package event_handler

import (
	"log/slog"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
)

type GetHistoryRequestData struct {
	// Since limits the history to readings taken after this time, in Unix
	// milliseconds. Zero or missing returns it all.
	Since int64 `json:"since" mapstructure:"since"`
}

func RegisterGetHistoryHandler(router *event.MessageRouter, dataStore *data.DataStore) {
	router.RegisterSimpleHandler(event.EventGetHistory, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received get history event", "message", message)

		var request GetHistoryRequestData
		if err := mapstructure.Decode(message.Data, &request); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Invalid request data format: " + err.Error(),
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeHistory,
			Subtype: event.ResponseSubtypeNone,
			Data:    dataStore.GetHistory(request.Since),
			Message: "Got history",
		}
	})
}
