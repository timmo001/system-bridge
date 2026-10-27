// Package desktop reports the desktop's windows, workspaces and keyboard
// layout.
package desktop

import (
	"log/slog"
	"sync/atomic"

	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

var hyprlandEventListener atomic.Pointer[func(types.HyprlandEvent)]

// OnHyprlandEvent calls listener with each custom event Hyprland sends, from a
// bind to its event dispatcher
func OnHyprlandEvent(listener func(types.HyprlandEvent)) {
	hyprlandEventListener.Store(&listener)
}

// windowTitlesEnabled is whether to report window titles, which are off by
// default as they can hold private information
func windowTitlesEnabled() bool {
	cfg, err := settings.Load()
	if err != nil {
		slog.Warn("Failed to load settings, leaving out window titles", "error", err)
		return false
	}
	return cfg.Desktop.WindowTitles
}

func pointer[T any](value T) *T {
	return &value
}

// nonEmpty is a pointer to value, or nil when it's empty
func nonEmpty(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
