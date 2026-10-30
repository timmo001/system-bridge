package event_handler

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/go-viper/mapstructure/v2"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/bluetooth"
	"github.com/timmo001/system-bridge/data/module/cameras"
	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/data/module/processes"
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

		request, response := decodeRequest[T](eventType, message, validate)
		if response != nil {
			return *response
		}

		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		if err := run(ctx, request); err != nil {
			slog.Warn("Action failed", "event", eventType, "error", err)
			return requestError(message, err)
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

// registerQuery registers an event that reads something: it decodes the
// event's data, refuses it when validate returns a message, then replies with
// what get returns within timeout
func registerQuery[T any, R any](
	router *event.MessageRouter,
	timeout time.Duration,
	eventType event.EventType,
	responseType event.ResponseType,
	done string,
	validate func(T) string,
	get func(context.Context, T) (R, error),
) {
	router.RegisterSimpleHandler(eventType, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received query event", "event", eventType, "message", message)

		request, response := decodeRequest[T](eventType, message, validate)
		if response != nil {
			return *response
		}

		ctx, cancel := context.WithTimeout(context.Background(), timeout)
		defer cancel()
		result, err := get(ctx, request)
		if err != nil {
			slog.Warn("Query failed", "event", eventType, "error", err)
			return requestError(message, err)
		}

		return event.MessageResponse{
			ID:      message.ID,
			Type:    responseType,
			Subtype: event.ResponseSubtypeNone,
			Data:    result,
			Message: done,
		}
	})
}

// decodeRequest decodes an event's data, or returns the error to reply with
func decodeRequest[T any](eventType event.EventType, message event.Message, validate func(T) string) (T, *event.MessageResponse) {
	var request T
	decoder, err := mapstructure.NewDecoder(&mapstructure.DecoderConfig{WeaklyTypedInput: true, Result: &request})
	if err == nil && message.Data != nil {
		err = decoder.Decode(message.Data)
	}
	problem := ""
	if err != nil {
		slog.Error("Failed to decode event data", "event", eventType, "error", err)
		problem = "Failed to decode the event data"
	} else {
		problem = validate(request)
	}
	if problem == "" {
		return request, nil
	}
	return request, &event.MessageResponse{
		ID:      message.ID,
		Type:    event.ResponseTypeError,
		Subtype: event.ResponseSubtypeBadRequest,
		Message: problem,
	}
}

// requestError is the reply for an action or query that failed
func requestError(message event.Message, err error) event.MessageResponse {
	subtype := event.ResponseSubtypeNone
	switch {
	case errors.Is(err, bluetooth.ErrUnsupported), errors.Is(err, cameras.ErrUnsupported), errors.Is(err, desktop.ErrUnsupported), errors.Is(err, desktop.ErrNotAllowed):
		subtype = event.ResponseSubtypeInvalidAction
	case errors.Is(err, bluetooth.ErrNotFound), errors.Is(err, cameras.ErrNotFound), errors.Is(err, cameras.ErrInvalidValue),
		errors.Is(err, desktop.ErrNotFound), errors.Is(err, desktop.ErrInvalidValue),
		errors.Is(err, processes.ErrNotFound), errors.Is(err, processes.ErrRefused):
		subtype = event.ResponseSubtypeBadRequest
	}
	return event.MessageResponse{
		ID:      message.ID,
		Type:    event.ResponseTypeError,
		Subtype: subtype,
		Message: err.Error(),
	}
}
