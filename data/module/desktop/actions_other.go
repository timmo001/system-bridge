//go:build !linux

package desktop

import (
	"context"
	"fmt"
)

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
