package cameras

import (
	"errors"
	"log/slog"

	"github.com/timmo001/system-bridge/settings"
)

// ErrUnsupported is returned for an action this platform can't do
var ErrUnsupported = errors.New("not supported on this platform")

// ErrNotFound is returned when no camera, or no control on it, has the id
// asked for
var ErrNotFound = errors.New("no camera or control with that id")

// ErrInvalidValue is returned for a value a control can't take, or a control
// that can't be set
var ErrInvalidValue = errors.New("invalid value")

// ErrNotAllowed is returned for a capture while the setting allowing it is off
var ErrNotAllowed = errors.New("taking pictures with cameras is turned off in the settings (cameras.capture)")

// ErrBusy is returned for a capture while another app has the camera to itself
var ErrBusy = errors.New("the camera is in use")

// captureEnabled is whether taking pictures is allowed, which is off by
// default as a camera can see the room it's in
func captureEnabled() bool {
	cfg, err := settings.Load()
	if err != nil {
		slog.Warn("Failed to load settings, leaving camera capture off", "error", err)
		return false
	}
	return cfg.Cameras.Capture
}
