package data_module

import (
	"context"

	"log/slog"

	"github.com/distatus/battery"
	"github.com/timmo001/system-bridge/types"
)

type BatteryModule struct{}

func (batteryModule BatteryModule) Name() types.ModuleName { return types.ModuleBattery }
func (batteryModule BatteryModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting battery data")

	// Get all batteries
	batteries, err := battery.GetAll()
	// The upstream battery library may return an error of type Errors when some
	// fields are unavailable (partial error), but still provide usable data.
	// Only treat this as fatal if no batteries are returned.
	if err != nil {
		slog.Debug("battery library returned errors (continuing with best-effort data)", "err", err)
	}

	// If no batteries found, return empty data
	if len(batteries) == 0 {
		slog.Debug("No batteries found")
		return types.BatteryData{
			IsCharging:    nil,
			Percentage:    nil,
			TimeRemaining: nil,
		}, nil
	}

	// Use the first battery (most systems only have one)
	bat := batteries[0]

	// Calculate percentage (guard against divide-by-zero)
	var percentagePtr *float64
	if bat.Full > 0 {
		percentage := (bat.Current / bat.Full) * 100
		percentagePtr = &percentage
	}

	// Determine if charging based on state string
	isCharging := bat.State.String() == "Charging"

	// Calculate time remaining (in seconds)
	// If charging, use time until full, otherwise use time until empty
	var timeRemainingPtr *float64
	if bat.ChargeRate > 0 {
		var timeRemaining float64
		if isCharging {
			timeRemaining = ((bat.Full - bat.Current) / bat.ChargeRate) * 3600
		} else {
			timeRemaining = (bat.Current / bat.ChargeRate) * 3600
		}
		timeRemainingPtr = &timeRemaining
	}

	return types.BatteryData{
		IsCharging:    &isCharging,
		Percentage:    percentagePtr,
		TimeRemaining: timeRemainingPtr,
	}, nil
}
