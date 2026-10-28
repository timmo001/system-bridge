//go:build !linux

package desktop

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/types"
)

// HyprlandDispatch isn't possible without Hyprland
func HyprlandDispatch(context.Context, types.HyprlandDispatcher, types.HyprlandDirection, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandMoveWindow isn't possible without Hyprland
func HyprlandMoveWindow(context.Context, string, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandSetWindow isn't possible without Hyprland
func HyprlandSetWindow(context.Context, string, HyprlandWindowSettings) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandKillWindow isn't possible without Hyprland
func HyprlandKillWindow(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandRunGlobalShortcut isn't possible without Hyprland
func HyprlandRunGlobalShortcut(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandRenameWorkspace isn't possible without Hyprland
func HyprlandRenameWorkspace(context.Context, string, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandMoveWorkspace isn't possible without Hyprland
func HyprlandMoveWorkspace(context.Context, string, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandSetSubmap isn't possible without Hyprland
func HyprlandSetSubmap(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandSetOption isn't possible without Hyprland
func HyprlandSetOption(context.Context, string, any) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandReloadConfig isn't possible without Hyprland
func HyprlandReloadConfig(context.Context) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandGetOption isn't possible without Hyprland
func HyprlandGetOption(context.Context, string) (*types.HyprlandOptionValue, error) {
	return nil, fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandCursorPosition isn't possible without Hyprland
func HyprlandCursorPosition(context.Context) (*types.HyprlandCursorPosition, error) {
	return nil, fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandLog isn't possible without Hyprland
func HyprlandLog(context.Context) (*types.HyprlandLog, error) {
	return nil, fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandMoveCursor isn't possible without Hyprland
func HyprlandMoveCursor(context.Context, int, int) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandSendEvent isn't possible without Hyprland
func HyprlandSendEvent(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandExec isn't possible without Hyprland
func HyprlandExec(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandDispatchRaw isn't possible without Hyprland
func HyprlandDispatchRaw(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandEval isn't possible without Hyprland
func HyprlandEval(context.Context, string) error {
	if !hyprlandCodeEnabled() {
		return ErrNotAllowed
	}
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// OmarchyMenu isn't possible without the Omarchy shell
func OmarchyMenu(context.Context, string, types.OmarchyAction) error {
	return fmt.Errorf("the Omarchy shell isn't running: %w", ErrUnsupported)
}

// OmarchyPanel isn't possible without the Omarchy shell
func OmarchyPanel(context.Context, string, types.OmarchyAction) error {
	return fmt.Errorf("the Omarchy shell isn't running: %w", ErrUnsupported)
}
