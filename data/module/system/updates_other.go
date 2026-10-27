//go:build !linux && !windows

package system

import (
	"context"

	"github.com/timmo001/system-bridge/types"
)

// listPackageUpdates isn't supported on this platform
func listPackageUpdates(context.Context) ([]types.SystemPackageUpdate, bool) {
	return nil, false
}
