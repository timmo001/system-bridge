//go:build !linux && !windows

package bluetooth

import (
	"context"

	"github.com/timmo001/system-bridge/types"
)

// GetBluetoothData isn't supported on this platform yet
func GetBluetoothData(context.Context) (types.BluetoothData, error) {
	return types.BluetoothData{Devices: []types.BluetoothDevice{}}, nil
}

// Watch does nothing on this platform, which reports no Bluetooth devices yet
func Watch(context.Context, func()) {}
