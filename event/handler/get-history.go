package event_handler

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type GetHistoryRequestData struct {
	// Since limits the history to readings taken after this time, in Unix
	// milliseconds. Zero or missing returns it all.
	Since int64 `json:"since" mapstructure:"since"`
	// Modules limits the history to these modules' readings. Empty or
	// missing returns every module's.
	Modules []types.ModuleName `json:"modules" mapstructure:"modules"`
}

func historyModuleList() string {
	names := make([]string, 0, len(data.HistoryModules()))
	for _, module := range data.HistoryModules() {
		names = append(names, string(module))
	}
	return strings.Join(names, ", ")
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

		for _, module := range request.Modules {
			if !data.HasHistory(module) {
				return event.MessageResponse{
					ID:      message.ID,
					Type:    event.ResponseTypeError,
					Subtype: event.ResponseSubtypeBadRequest,
					Message: fmt.Sprintf("No history is kept for %q. Modules with history: %s", module, historyModuleList()),
				}
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeHistory,
			Subtype: event.ResponseSubtypeNone,
			Data:    dataStore.GetHistory(request.Since, request.Modules...),
			Message: "Got history",
		}
	})
}
