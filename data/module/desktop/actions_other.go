//go:build !linux

package desktop

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/types"
)

// HyprlandDispatch isn't possible without Hyprland
func HyprlandDispatch(context.Context, types.HyprlandDispatcher, types.HyprlandDirection) error {
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

// HyprlandRunGlobalShortcut isn't possible without Hyprland
func HyprlandRunGlobalShortcut(context.Context, string) error {
	return fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
}

// HyprlandReloadConfig isn't possible without Hyprland
func HyprlandReloadConfig(context.Context) error {
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
