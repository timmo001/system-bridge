//go:build !linux

package system

import "github.com/timmo001/system-bridge/types"

// GetFailedUnits returns nil, since there's no systemd on this platform
func GetFailedUnits() *[]types.SystemFailedUnit {
	return nil
}
