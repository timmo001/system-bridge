//go:build !linux

package battery

import (
	"fmt"
	"log/slog"

	"github.com/distatus/battery"
	"github.com/timmo001/system-bridge/types"
)

func readBatteries() []types.BatteryInfo {
	batteries := make([]types.BatteryInfo, 0)

	// The library returns Errors when some fields are unavailable, alongside
	// the data it could read
	all, err := battery.GetAll()
	errs, _ := err.(battery.Errors)
	if err != nil && errs == nil {
		slog.Debug("Batteries unavailable", "error", err)
		return batteries
	}

	for i, bat := range all {
		if bat == nil {
			continue
		}
		var partial battery.ErrPartial
		if i < len(errs) && errs[i] != nil {
			p, ok := errs[i].(battery.ErrPartial)
			if !ok {
				continue
			}
			partial = p
		}

		info := types.BatteryInfo{
			Name:  fmt.Sprintf("BAT%d", i),
			Scope: types.BatteryScopeSystem,
			State: types.BatteryStateUnknown,
		}
		if partial.State == nil {
			info.State = parseState(bat.State.Raw)
		}
		if partial.Current == nil && partial.Full == nil && bat.Full > 0 {
			percentage := min(bat.Current/bat.Full*100, 100)
			info.Percentage = &percentage
		}
		if partial.Voltage == nil && bat.Voltage > 0 {
			voltage := bat.Voltage
			info.Voltage = &voltage
		}
		if partial.ChargeRate == nil {
			power := bat.ChargeRate / 1000
			info.Power = &power
			if partial.Current == nil && partial.Full == nil {
				info.TimeRemaining = timeRemaining(info.State, bat.Current, bat.Full, bat.ChargeRate)
			}
		}
		batteries = append(batteries, info)
	}
	return batteries
}

func parseState(state battery.AgnosticState) types.BatteryState {
	switch state {
	case battery.Charging:
		return types.BatteryStateCharging
	case battery.Discharging:
		return types.BatteryStateDischarging
	case battery.Full:
		return types.BatteryStateFull
	case battery.Idle:
		return types.BatteryStateNotCharging
	case battery.Empty:
		return types.BatteryStateEmpty
	default:
		return types.BatteryStateUnknown
	}
}
