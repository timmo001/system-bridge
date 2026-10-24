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
