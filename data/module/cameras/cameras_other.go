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
