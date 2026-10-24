//go:build !linux && !windows

package desktop

import (
	"context"

	"github.com/timmo001/system-bridge/types"
)

// Get reports nothing on this platform, which isn't supported yet
func Get(context.Context) (*types.DesktopData, error) {
	return nil, nil
}

// Watch does nothing on this platform, which isn't supported yet
func Watch(context.Context, func()) {}

// FocusWindow isn't possible on this platform yet
func FocusWindow(context.Context, string) error { return ErrUnsupported }

// CloseWindow isn't possible on this platform yet
func CloseWindow(context.Context, string) error { return ErrUnsupported }

// SetWindowState isn't possible on this platform yet
func SetWindowState(context.Context, string, WindowState) error { return ErrUnsupported }

// FocusWorkspace isn't possible on this platform yet
func FocusWorkspace(context.Context, string) error { return ErrUnsupported }

// SetKeyboardLayout isn't possible on this platform yet
func SetKeyboardLayout(context.Context, string) error { return ErrUnsupported }
