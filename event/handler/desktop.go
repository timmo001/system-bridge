package event_handler

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

const desktopTimeout = 10 * time.Second

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
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventDesktopCloseWindow, event.ResponseTypeDesktopWindowClosed, "Window closed",
		func(request DesktopWindowRequestData) string { return required(request.ID, "No window id provided") },
		func(ctx context.Context, request DesktopWindowRequestData) error {
			return desktop.CloseWindow(ctx, request.ID)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventDesktopFocusWindow, event.ResponseTypeDesktopWindowFocused, "Window focused",
		func(request DesktopWindowRequestData) string { return required(request.ID, "No window id provided") },
		func(ctx context.Context, request DesktopWindowRequestData) error {
			return desktop.FocusWindow(ctx, request.ID)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventDesktopFocusWorkspace, event.ResponseTypeDesktopWorkspaceFocused, "Workspace focused",
		func(request DesktopWorkspaceRequestData) string {
			return required(request.ID, "No workspace id provided")
		},
		func(ctx context.Context, request DesktopWorkspaceRequestData) error {
			return desktop.FocusWorkspace(ctx, request.ID)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventDesktopSetKeyboardLayout, event.ResponseTypeDesktopKeyboardLayoutSet, "Keyboard layout set",
		func(request DesktopKeyboardLayoutRequestData) string {
			return required(request.Layout, "No layout provided")
		},
		func(ctx context.Context, request DesktopKeyboardLayoutRequestData) error {
			return desktop.SetKeyboardLayout(ctx, request.Layout)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventDesktopSetWindowState, event.ResponseTypeDesktopWindowStateSet, "Window state set",
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
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandMoveWindow, event.ResponseTypeHyprlandWindowMoved, "Window moved",
		func(request HyprlandMoveWindowRequestData) string {
			if request.Workspace == "" {
				return "No workspace provided"
			}
			return required(request.ID, "No window id provided")
		},
		func(ctx context.Context, request HyprlandMoveWindowRequestData) error {
			return desktop.HyprlandMoveWindow(ctx, request.ID, request.Workspace)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandReloadConfig, event.ResponseTypeHyprlandConfigReloaded, "Config reloaded",
		func(struct{}) string { return "" },
		func(ctx context.Context, _ struct{}) error {
			return desktop.HyprlandReloadConfig(ctx)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandRunGlobalShortcut, event.ResponseTypeHyprlandGlobalShortcutRun, "Global shortcut run",
		func(request HyprlandGlobalShortcutRequestData) string {
			return required(request.Name, "No shortcut name provided")
		},
		func(ctx context.Context, request HyprlandGlobalShortcutRequestData) error {
			return desktop.HyprlandRunGlobalShortcut(ctx, request.Name)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandSetWindow, event.ResponseTypeHyprlandWindowSet, "Window set",
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
