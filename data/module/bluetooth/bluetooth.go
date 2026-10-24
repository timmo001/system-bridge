package bluetooth

import (
	"cmp"
	"slices"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// sortDevices orders devices by name, then address
func sortDevices(devices []types.BluetoothDevice) {
	slices.SortFunc(devices, func(a, b types.BluetoothDevice) int {
		return cmp.Or(
			strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name)),
			strings.Compare(a.Address, b.Address),
		)
	})
}
