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
	X        *int   `json:"x" mapstructure:"x"`
	Y        *int   `json:"y" mapstructure:"y"`
	Width    *int   `json:"width" mapstructure:"width"`
	Height   *int   `json:"height" mapstructure:"height"`
}

type HyprlandGlobalShortcutRequestData struct {
	Name string `json:"name" mapstructure:"name"`
}

type HyprlandRenameWorkspaceRequestData struct {
	ID   string `json:"id" mapstructure:"id"`
	Name string `json:"name" mapstructure:"name"`
}

type HyprlandMoveWorkspaceRequestData struct {
	ID      string `json:"id" mapstructure:"id"`
	Display string `json:"display" mapstructure:"display"`
}

type HyprlandSubmapRequestData struct {
	Name string `json:"name" mapstructure:"name"`
}

type HyprlandDispatchRequestData struct {
	Dispatcher types.HyprlandDispatcher `json:"dispatcher" mapstructure:"dispatcher"`
	Direction  types.HyprlandDirection  `json:"direction" mapstructure:"direction"`
	ID         string                   `json:"id" mapstructure:"id"` // A window to focus first
}

type OmarchyRequestData struct {
	ID     string              `json:"id" mapstructure:"id"`
	Action types.OmarchyAction `json:"action" mapstructure:"action"`
}

func validateOmarchyAction(action types.OmarchyAction) string {
	switch action {
	case types.OmarchyActionClose, types.OmarchyActionOpen, types.OmarchyActionToggle:
		return ""
	case "":
		return "No action provided"
	}
	return "Action must be open, close or toggle"
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
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandDispatch, event.ResponseTypeHyprlandDispatched, "Dispatched",
		func(request HyprlandDispatchRequestData) string {
			return required(string(request.Dispatcher), "No dispatcher provided")
		},
		func(ctx context.Context, request HyprlandDispatchRequestData) error {
			return desktop.HyprlandDispatch(ctx, request.Dispatcher, request.Direction, request.ID)
		})
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
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandRenameWorkspace, event.ResponseTypeHyprlandWorkspaceRenamed, "Workspace renamed",
		func(request HyprlandRenameWorkspaceRequestData) string {
			return required(request.ID, "No workspace id provided")
		},
		func(ctx context.Context, request HyprlandRenameWorkspaceRequestData) error {
			return desktop.HyprlandRenameWorkspace(ctx, request.ID, request.Name)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandMoveWorkspace, event.ResponseTypeHyprlandWorkspaceMoved, "Workspace moved",
		func(request HyprlandMoveWorkspaceRequestData) string {
			if request.Display == "" {
				return "No display provided"
			}
			return required(request.ID, "No workspace id provided")
		},
		func(ctx context.Context, request HyprlandMoveWorkspaceRequestData) error {
			return desktop.HyprlandMoveWorkspace(ctx, request.ID, request.Display)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandSetSubmap, event.ResponseTypeHyprlandSubmapSet, "Submap set",
		func(HyprlandSubmapRequestData) string { return "" },
		func(ctx context.Context, request HyprlandSubmapRequestData) error {
			return desktop.HyprlandSetSubmap(ctx, request.Name)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandSetWindow, event.ResponseTypeHyprlandWindowSet, "Window set",
		func(request HyprlandSetWindowRequestData) string {
			if (request.X == nil) != (request.Y == nil) {
				return "Provide both x and y"
			}
			if (request.Width == nil) != (request.Height == nil) {
				return "Provide both width and height"
			}
			if request.Width != nil && (*request.Width <= 0 || *request.Height <= 0) {
				return "Width and height must be more than 0"
			}
			if request.Floating == nil && request.Pinned == nil && request.X == nil && request.Width == nil {
				return "Provide floating, pinned, a position or a size"
			}
			return required(request.ID, "No window id provided")
		},
		func(ctx context.Context, request HyprlandSetWindowRequestData) error {
			return desktop.HyprlandSetWindow(ctx, request.ID, desktop.HyprlandWindowSettings{
				Floating: request.Floating,
				Pinned:   request.Pinned,
				X:        request.X,
				Y:        request.Y,
				Width:    request.Width,
				Height:   request.Height,
			})
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventHyprlandKillWindow, event.ResponseTypeHyprlandWindowKilled, "Window killed",
		func(request DesktopWindowRequestData) string { return required(request.ID, "No window id provided") },
		func(ctx context.Context, request DesktopWindowRequestData) error {
			return desktop.HyprlandKillWindow(ctx, request.ID)
		})
}

func RegisterOmarchyHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventOmarchyMenu, event.ResponseTypeOmarchyMenuChanged, "Menu changed",
		func(request OmarchyRequestData) string {
			if message := validateOmarchyAction(request.Action); message != "" {
				return message
			}
			if request.Action == types.OmarchyActionClose {
				return ""
			}
			return required(request.ID, "No menu id provided")
		},
		func(ctx context.Context, request OmarchyRequestData) error {
			return desktop.OmarchyMenu(ctx, request.ID, request.Action)
		})
	registerAction(router, dataStore, types.ModuleDesktop, desktopTimeout, event.EventOmarchyPanel, event.ResponseTypeOmarchyPanelChanged, "Panel changed",
		func(request OmarchyRequestData) string {
			if message := validateOmarchyAction(request.Action); message != "" {
				return message
			}
			return required(request.ID, "No panel id provided")
		},
		func(ctx context.Context, request OmarchyRequestData) error {
			return desktop.OmarchyPanel(ctx, request.ID, request.Action)
		})
}

func required(value string, message string) string {
	if value == "" {
		return message
	}
	return ""
}
