package event_handler

import (
	"context"
	"log/slog"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/utils/handlers/input"
	"github.com/timmo001/system-bridge/utils/handlers/mouse"
)

// The portal can wait on the person to allow remote control the first time
const inputStatusTimeout = 2 * time.Minute

func RegisterMouseHandlers(router *event.MessageRouter) {
	registerInput(router, event.EventMouseMove, event.ResponseTypeMouseMoved, "Mouse moved",
		func(mouse.MoveData) string { return "" }, mouse.Move)
	registerInput(router, event.EventMouseClick, event.ResponseTypeMouseClicked, "Mouse clicked",
		mouse.ValidateClick, mouse.Click)
	registerInput(router, event.EventMouseButton, event.ResponseTypeMouseButtonSet, "Mouse button set",
		mouse.ValidateButton, mouse.Button)
	registerInput(router, event.EventMouseScroll, event.ResponseTypeMouseScrolled, "Mouse scrolled",
		func(mouse.ScrollData) string { return "" }, mouse.Scroll)
}

func RegisterGetInputStatusHandler(router *event.MessageRouter) {
	registerQuery(router, inputStatusTimeout, event.EventGetInputStatus, event.ResponseTypeInputStatus, "Input status",
		func(struct{}) string { return "" },
		func(context.Context, struct{}) (*input.Status, error) {
			status := input.CurrentStatus()
			return &status, nil
		})
}

// registerInput registers an event that sends input. Pointer moves come many
// times a second, so it logs only failures.
func registerInput[T any](
	router *event.MessageRouter,
	eventType event.EventType,
	responseType event.ResponseType,
	done string,
	validate func(T) string,
	run func(T) error,
) {
	router.RegisterSimpleHandler(eventType, func(connection string, message event.Message) event.MessageResponse {
		request, response := decodeRequest[T](eventType, message, validate)
		if response != nil {
			return *response
		}

		if err := run(request); err != nil {
			slog.Warn("Failed to send input", "event", eventType, "error", err)
			return requestError(message, err)
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
