package event_handler

import (
	"context"
	"log/slog"
	"runtime"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/logging"
	"github.com/timmo001/system-bridge/version"
)

const diagnosticsTimeout = 5 * time.Second

// startedAt stands in for when the app started, as handlers load with it
var startedAt = time.Now()

func RegisterGetDiagnosticsHandler(router *event.MessageRouter, dataStore *data.DataStore) {
	registerQuery(router, diagnosticsTimeout, event.EventGetDiagnostics, event.ResponseTypeDiagnostics, "Got diagnostics",
		func(struct{}) string { return "" },
		func(context.Context, struct{}) (*types.Diagnostics, error) {
			return getDiagnostics(dataStore), nil
		})
}

func getDiagnostics(dataStore *data.DataStore) *types.Diagnostics {
	diagnostics := &types.Diagnostics{
		Version:      version.Version,
		Platform:     runtime.GOOS,
		Architecture: runtime.GOARCH,
		StartedAt:    startedAt.Unix(),
		LogLevel:     logging.LogLevel.Level().String(),
		Modules:      dataStore.ModuleDiagnostics(),
		RecentErrors: logging.Recent.Records(),
	}

	loaded, err := settings.Load()
	if err != nil {
		slog.Warn("Failed to load settings for diagnostics", "error", err)
		return diagnostics
	}
	diagnostics.Settings = &types.DiagnosticsSettings{
		Autostart:                   loaded.Autostart,
		SystemTray:                  loaded.SystemTray,
		Hotkeys:                     len(loaded.Hotkeys),
		Commands:                    len(loaded.Commands.Allowlist),
		MediaDirectories:            len(loaded.Media.Directories),
		AllowedSecondaryMountPoints: len(loaded.Disks.AllowedSecondaryMountPoints),
		CamerasCapture:              loaded.Cameras.Capture,
		DesktopWindowTitles:         loaded.Desktop.WindowTitles,
		DesktopHyprlandCode:         loaded.Desktop.HyprlandCode,
	}
	return diagnostics
}
