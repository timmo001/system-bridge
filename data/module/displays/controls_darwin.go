//go:build darwin

package displays

import (
	"context"

	"github.com/timmo001/system-bridge/types"
)

// SetBrightness isn't supported on macOS yet
func SetBrightness(_ context.Context, _ string, _ float64) error {
	return ErrUnsupported
}

// SetPowerState isn't supported on macOS yet
func SetPowerState(_ context.Context, _ string, _ types.DisplayPowerState) error {
	return ErrUnsupported
}
