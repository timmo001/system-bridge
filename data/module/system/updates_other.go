//go:build !linux && !windows

package system

import "context"

// countPackageUpdates isn't supported on this platform
func countPackageUpdates(context.Context) (int, bool) {
	return 0, false
}
