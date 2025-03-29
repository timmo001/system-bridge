package displays

import "github.com/timmo001/system-bridge/types"

// GetDisplays returns display information for the current platform
func GetDisplays() ([]types.Display, error) {
	return getDisplays()
}
