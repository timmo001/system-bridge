package event_handler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/data"
	data_module "github.com/timmo001/system-bridge/data/module"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/services"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/handlers/command"
)

type ServiceActionRequestData struct {
	Provider string `json:"provider" mapstructure:"provider"`
	Item     string `json:"item" mapstructure:"item"`
	Action   string `json:"action" mapstructure:"action"`
}

// CheckServiceAction finds the act command for an action in the services
// module's latest data, or says why it can't run
func CheckServiceAction(dataStore *data.DataStore, request ServiceActionRequestData) ([]string, error) {
	if request.Provider == "" || request.Item == "" || request.Action == "" {
		return nil, errors.New("a provider, item and action are required")
	}
	cfg, err := settings.Load()
	if err != nil {
		return nil, fmt.Errorf("load settings: %w", err)
	}
	module, err := dataStore.GetModule(types.ModuleServices)
	if err != nil {
		return nil, fmt.Errorf("get services: %w", err)
	}
	current, err := services.FromModuleData(module.Data)
	if err != nil {
		return nil, err
	}
	return services.Check(current, cfg.Services.Providers, request.Provider, request.Item, request.Action)
}

// RunServiceAction runs a checked action, tells every client how it went
// with SERVICE_ACTION_COMPLETED under the request's id, so the sender gets
// it as its answer, then reads the services again
func RunServiceAction(ctx context.Context, dataStore *data.DataStore, act []string, request ServiceActionRequestData, requestID, connection string) types.ServiceActionResult {
	// Audit log: who asked, and exactly what runs
	slog.Info("Running service action",
		"provider", request.Provider, "item", request.Item, "action", request.Action,
		"command", act, "connection", connection, "requestID", requestID)

	result := services.Run(ctx, act, request.Provider, request.Item, request.Action)

	level := slog.LevelInfo
	if !result.OK {
		level = slog.LevelWarn
	}
	slog.Log(ctx, level, "Service action finished",
		"provider", request.Provider, "item", request.Item, "action", request.Action,
		"ok", result.OK, "summary", result.Summary, "connection", connection, "requestID", requestID)

	if ws := websocket.GetInstance(); ws != nil {
		ws.BroadcastMessage(event.MessageResponse{
			ID:      requestID,
			Type:    event.ResponseTypeServiceActionCompleted,
			Subtype: event.ResponseSubtypeNone,
			Data:    result,
			Message: result.Summary,
		})
	}

	refreshServices(dataStore)
	return result
}

// refreshServices reads the services again, outside the store's lock, so a
// slow provider doesn't hold up every other module as TriggerModuleUpdate
// would
func refreshServices(dataStore *data.DataStore) {
	ctx, cancel := context.WithTimeout(command.ServerContext(), 20*time.Second)
	defer cancel()
	updated, err := data_module.ServicesModule{}.Update(ctx)
	if err != nil {
		slog.Warn("Failed to read the services after an action", "error", err)
		return
	}
	if err := dataStore.SetModuleData(types.ModuleServices, updated); err != nil {
		slog.Warn("Failed to update the services after an action", "error", err)
	}
}

func RegisterServiceActionHandler(router *event.MessageRouter, dataStore *data.DataStore) {
	router.RegisterSimpleHandler(event.EventServiceAction, func(connection string, message event.Message) event.MessageResponse {
		var request ServiceActionRequestData
		if err := mapstructure.Decode(message.Data, &request); err != nil {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: event.ResponseSubtypeBadRequest,
				Message: "Failed to decode service action event data",
			}
		}

		act, err := CheckServiceAction(dataStore, request)
		if err != nil {
			slog.Warn("Service action refused", "provider", request.Provider, "item", request.Item,
				"action", request.Action, "connection", connection, "error", err)
			subtype := event.ResponseSubtypeBadRequest
			if errors.Is(err, services.ErrActionNotFound) {
				subtype = event.ResponseSubtypeServiceActionNotFound
			}
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: err.Error(),
			}
		}

		// The result goes to every client once it's done, so this answers
		// straight away rather than holding up the connection
		go RunServiceAction(command.ServerContext(), dataStore, act, request, message.ID, connection)

		return event.MessageResponse{
			ID:      message.ID,
			Type:    event.ResponseTypeServiceActionRunning,
			Subtype: event.ResponseSubtypeNone,
			Data:    request,
			Message: "Service action is running",
		}
	})
}
