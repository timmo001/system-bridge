package battery

import (
	"github.com/timmo001/system-bridge/types"
)

// Gather reads every battery and whether AC power is connected. The top-level
// battery fields come from the first system battery, so a wireless mouse or
// headset never stands in for the system's own battery.
func Gather() types.BatteryData {
	data := types.BatteryData{
		ACConnected: acConnected(),
		Batteries:   readBatteries(),
	}

	for _, bat := range data.Batteries {
		if bat.Scope != types.BatteryScopeSystem {
			continue
		}
		isCharging := bat.State == types.BatteryStateCharging
		state := bat.State
		data.IsCharging = &isCharging
		data.State = &state
		data.Percentage = bat.Percentage
		data.TimeRemaining = bat.TimeRemaining
		data.Power = bat.Power
		data.Voltage = bat.Voltage
		break
	}

	return data
}

// timeRemaining returns the seconds until full when charging, or until empty
// when discharging. now and full must share a unit with rate per hour, such as
// Wh and W, or Ah and A.
func timeRemaining(state types.BatteryState, now, full, rate float64) *float64 {
	if rate <= 0 {
		return nil
	}
	var hours float64
	switch state {
	case types.BatteryStateCharging:
		if full <= now {
			return nil
		}
		hours = (full - now) / rate
	case types.BatteryStateDischarging:
		hours = now / rate
	default:
		return nil
	}
	seconds := hours * 3600
	return &seconds
}
