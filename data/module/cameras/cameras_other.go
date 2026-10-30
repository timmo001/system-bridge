//go:build !linux

package cameras

import (
	"context"

	"github.com/timmo001/system-bridge/types"
)

// GetCamerasData isn't supported on this platform yet
func GetCamerasData(context.Context) (types.CamerasData, error) {
	return types.CamerasData{Cameras: []types.Camera{}}, nil
}

// Watch does nothing on this platform, which reports no cameras yet
func Watch(context.Context, func()) {}

// SetControl isn't supported on this platform yet
func SetControl(context.Context, string, string, int64) error {
	return ErrUnsupported
}

// Capture isn't supported on this platform yet
func Capture(context.Context, string, *types.CameraSize) ([]byte, error) {
	if !captureEnabled() {
		return nil, ErrNotAllowed
	}
	return nil, ErrUnsupported
}
