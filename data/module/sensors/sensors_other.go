//go:build !linux

package sensors

import "github.com/timmo001/system-bridge/types"

// GetFansData returns an empty slice on platforms without hwmon fan support.
func GetFansData() []types.Fan {
	return make([]types.Fan, 0)
}
