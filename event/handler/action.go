package event_handler

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/bluetooth"
	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

// registerAction registers an event that runs an action: it decodes the
// event's data, refuses it when validate returns a message, runs the action
// within timeout, then refreshes the module the action changed
func registerAction[T any](
	router *event.MessageRouter,
	dataStore *data.DataStore,
	module types.ModuleName,
	timeout time.Duration,
	eventType event.EventType,
	responseType event.ResponseType,
	done string,
	validate func(T) string,
	run func(context.Context, T) error,
) {
	router.RegisterSimpleHandler(eventType, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received action event", "event", eventType, "message", message)

		errorResponse := func(subtype event.ResponseSubtype, msg string) event.MessageResponse {
			return event.MessageResponse{
				ID:      message.ID,
				Type:    event.ResponseTypeError,
				Subtype: subtype,
				Message: msg,
			}
		}

		var request T
		decoder, err := mapstructure.NewDecoder(&mapstructure.DecoderConfig{WeaklyTypedInput: true, Result: &request})
		if err == nil && message.Data != nil {
			err = decoder.Decode(message.Data)
		}
		if err != nil {
			slog.Error("Failed to decode action event data", "event", eventType, "error", err)
			return errorResponse(event.ResponseSubtypeBadRequest, "Failed to decode the event data")
		}
		if problem := validate(request); problem != "" {
			return errorResponse(event.ResponseSubtypeBadRequest, problem)
		}

		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		if err := run(ctx, request); err != nil {
			slog.Warn("Action failed", "event", eventType, "error", err)
			subtype := event.ResponseSubtypeNone
			switch {
			case errors.Is(err, bluetooth.ErrUnsupported), errors.Is(err, desktop.ErrUnsupported):
				subtype = event.ResponseSubtypeInvalidAction
			case errors.Is(err, bluetooth.ErrNotFound), errors.Is(err, desktop.ErrNotFound):
				subtype = event.ResponseSubtypeBadRequest
			}
			return errorResponse(subtype, err.Error())
		}

		if dataStore != nil {
			if err := dataStore.TriggerModuleUpdate(module); err != nil {
				slog.Warn("Failed to trigger module update", "module", module, "error", err)
			}
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    responseType,
			Subtype: event.ResponseSubtypeNone,
			Data:    message.Data,
			Message: done,
		}
	})
}
