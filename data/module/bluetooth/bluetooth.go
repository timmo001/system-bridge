package bluetooth

import (
	"cmp"
	"errors"
	"slices"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// ErrUnsupported is returned for an action this platform can't do
var ErrUnsupported = errors.New("not supported on this platform")

// ErrNotFound is returned when no paired device has the address asked for
var ErrNotFound = errors.New("no paired device with that address")

// sortDevices orders devices by name, then address
func sortDevices(devices []types.BluetoothDevice) {
	slices.SortFunc(devices, func(a, b types.BluetoothDevice) int {
		return cmp.Or(
			strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name)),
			strings.Compare(a.Address, b.Address),
		)
	})
}
