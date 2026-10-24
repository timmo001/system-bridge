package displays

import (
	"errors"

	"github.com/timmo001/system-bridge/types"
)

// ErrUnsupported is returned when a display can't be controlled the way asked,
// such as a monitor without DDC/CI
var ErrUnsupported = errors.New("not supported by this display")

// powerStateValues are the VCP D6 (power mode) values for each state
var powerStateValues = map[types.DisplayPowerState]int{
	types.DisplayPowerStateOn:      1,
	types.DisplayPowerStateStandby: 2,
	types.DisplayPowerStateSuspend: 3,
	types.DisplayPowerStateOff:     4,
}

// powerState maps a VCP D6 value. 5 is a hard power off, which reads the same
// as off.
func powerState(value int) *types.DisplayPowerState {
	for state, stateValue := range powerStateValues {
		if stateValue == value {
			return &state
		}
	}
	if value == 5 {
		state := types.DisplayPowerStateOff
		return &state
	}
	return nil
}
