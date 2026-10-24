package event_handler

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

type DesktopWindowRequestData struct {
	ID string `json:"id" mapstructure:"id"`
}

type DesktopWindowStateRequestData struct {
	ID         string `json:"id" mapstructure:"id"`
	Fullscreen *bool  `json:"fullscreen" mapstructure:"fullscreen"`
	Maximised  *bool  `json:"maximised" mapstructure:"maximised"`
	Minimised  *bool  `json:"minimised" mapstructure:"minimised"`
}

type DesktopWorkspaceRequestData struct {
	ID string `json:"id" mapstructure:"id"`
}

type DesktopKeyboardLayoutRequestData struct {
	Layout string `json:"layout" mapstructure:"layout"`
}

type HyprlandMoveWindowRequestData struct {
	ID        string `json:"id" mapstructure:"id"`
	Workspace string `json:"workspace" mapstructure:"workspace"`
}

type HyprlandSetWindowRequestData struct {
	ID       string `json:"id" mapstructure:"id"`
	Floating *bool  `json:"floating" mapstructure:"floating"`
	Pinned   *bool  `json:"pinned" mapstructure:"pinned"`
}

type HyprlandGlobalShortcutRequestData struct {
	Name string `json:"name" mapstructure:"name"`
}

func RegisterDesktopHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerDesktopAction(router, dataStore, event.EventDesktopCloseWindow, event.ResponseTypeDesktopWindowClosed, "Window closed",
		func(request DesktopWindowRequestData) string { return required(request.ID, "No window id provided") },
		func(ctx context.Context, request DesktopWindowRequestData) error {
			return desktop.CloseWindow(ctx, request.ID)
		})
	registerDesktopAction(router, dataStore, event.EventDesktopFocusWindow, event.ResponseTypeDesktopWindowFocused, "Window focused",
		func(request DesktopWindowRequestData) string { return required(request.ID, "No window id provided") },
		func(ctx context.Context, request DesktopWindowRequestData) error {
			return desktop.FocusWindow(ctx, request.ID)
		})
	registerDesktopAction(router, dataStore, event.EventDesktopFocusWorkspace, event.ResponseTypeDesktopWorkspaceFocused, "Workspace focused",
		func(request DesktopWorkspaceRequestData) string {
			return required(request.ID, "No workspace id provided")
		},
		func(ctx context.Context, request DesktopWorkspaceRequestData) error {
			return desktop.FocusWorkspace(ctx, request.ID)
		})
	registerDesktopAction(router, dataStore, event.EventDesktopSetKeyboardLayout, event.ResponseTypeDesktopKeyboardLayoutSet, "Keyboard layout set",
		func(request DesktopKeyboardLayoutRequestData) string {
			return required(request.Layout, "No layout provided")
		},
		func(ctx context.Context, request DesktopKeyboardLayoutRequestData) error {
			return desktop.SetKeyboardLayout(ctx, request.Layout)
		})
	registerDesktopAction(router, dataStore, event.EventDesktopSetWindowState, event.ResponseTypeDesktopWindowStateSet, "Window state set",
		func(request DesktopWindowStateRequestData) string {
			if request.Fullscreen == nil && request.Maximised == nil && request.Minimised == nil {
				return "Provide fullscreen, maximised or minimised"
			}
			return required(request.ID, "No window id provided")
		},
		func(ctx context.Context, request DesktopWindowStateRequestData) error {
			return desktop.SetWindowState(ctx, request.ID, desktop.WindowState{
				Fullscreen: request.Fullscreen,
				Maximised:  request.Maximised,
				Minimised:  request.Minimised,
			})
		})
}

func RegisterHyprlandHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerDesktopAction(router, dataStore, event.EventHyprlandMoveWindow, event.ResponseTypeHyprlandWindowMoved, "Window moved",
		func(request HyprlandMoveWindowRequestData) string {
			if request.Workspace == "" {
				return "No workspace provided"
			}
			return required(request.ID, "No window id provided")
		},
		func(ctx context.Context, request HyprlandMoveWindowRequestData) error {
			return desktop.HyprlandMoveWindow(ctx, request.ID, request.Workspace)
		})
	registerDesktopAction(router, dataStore, event.EventHyprlandReloadConfig, event.ResponseTypeHyprlandConfigReloaded, "Config reloaded",
		func(struct{}) string { return "" },
		func(ctx context.Context, _ struct{}) error {
			return desktop.HyprlandReloadConfig(ctx)
		})
	registerDesktopAction(router, dataStore, event.EventHyprlandRunGlobalShortcut, event.ResponseTypeHyprlandGlobalShortcutRun, "Global shortcut run",
		func(request HyprlandGlobalShortcutRequestData) string {
			return required(request.Name, "No shortcut name provided")
		},
		func(ctx context.Context, request HyprlandGlobalShortcutRequestData) error {
			return desktop.HyprlandRunGlobalShortcut(ctx, request.Name)
		})
	registerDesktopAction(router, dataStore, event.EventHyprlandSetWindow, event.ResponseTypeHyprlandWindowSet, "Window set",
		func(request HyprlandSetWindowRequestData) string {
			if request.Floating == nil && request.Pinned == nil {
				return "Provide floating or pinned"
			}
			return required(request.ID, "No window id provided")
		},
		func(ctx context.Context, request HyprlandSetWindowRequestData) error {
			return desktop.HyprlandSetWindow(ctx, request.ID, desktop.HyprlandWindowSettings{
				Floating: request.Floating,
				Pinned:   request.Pinned,
			})
		})
}

func required(value string, message string) string {
	if value == "" {
		return message
	}
	return ""
}

// registerDesktopAction registers an event that runs a desktop action: it
// decodes the event's data, refuses it when validate returns a message, runs
// the action, then refreshes the desktop module
func registerDesktopAction[T any](
	router *event.MessageRouter,
	dataStore *data.DataStore,
	eventType event.EventType,
	responseType event.ResponseType,
	done string,
	validate func(T) string,
	run func(context.Context, T) error,
) {
	router.RegisterSimpleHandler(eventType, func(connection string, message event.Message) event.MessageResponse {
		slog.Debug("Received desktop event", "event", eventType, "message", message)

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
			slog.Error("Failed to decode desktop event data", "event", eventType, "error", err)
			return errorResponse(event.ResponseSubtypeBadRequest, "Failed to decode the event data")
		}
		if problem := validate(request); problem != "" {
			return errorResponse(event.ResponseSubtypeBadRequest, problem)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := run(ctx, request); err != nil {
			slog.Warn("Desktop action failed", "event", eventType, "error", err)
			subtype := event.ResponseSubtypeNone
			switch {
			case errors.Is(err, desktop.ErrUnsupported):
				subtype = event.ResponseSubtypeInvalidAction
			case errors.Is(err, desktop.ErrNotFound):
				subtype = event.ResponseSubtypeBadRequest
			}
			return errorResponse(subtype, err.Error())
		}

		if dataStore != nil {
			if err := dataStore.TriggerModuleUpdate(types.ModuleDesktop); err != nil {
				slog.Warn("Failed to trigger desktop module update", "error", err)
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
