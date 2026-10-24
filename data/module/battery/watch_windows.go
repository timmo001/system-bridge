//go:build windows

package battery

import (
	"context"
	"errors"
	"time"
	"unsafe"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchInterval is how often to check the power status, which is a single
// cheap call
const watchInterval = 2 * time.Second

// powerState is the part of the power status that changes with the battery
// or charger, leaving out the estimated times, which move constantly
type powerState struct {
	acLineStatus       byte
	batteryFlag        byte
	batteryLifePercent byte
}

// Watch calls changed whenever the charger is plugged in or removed, or the
// battery's charge or state changes, until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Poll(ctx, watchInterval, func() (powerState, error) {
		var status systemPowerStatus
		if ret, _, err := procGetSystemPowerStatus.Call(uintptr(unsafe.Pointer(&status))); ret == 0 {
			return powerState{}, errors.Join(errors.New("GetSystemPowerStatus failed"), err)
		}
		return powerState{
			acLineStatus:       status.ACLineStatus,
			batteryFlag:        status.BatteryFlag,
			batteryLifePercent: status.BatteryLifePercent,
		}, nil
	}, changed)
}
