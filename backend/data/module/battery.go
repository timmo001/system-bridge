package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/distatus/battery"
)

// BatteryData represents battery information
type BatteryData struct {
	IsCharging    *bool    `json:"is_charging" mapstructure:"is_charging"`
	Percentage    *float64 `json:"percentage" mapstructure:"percentage"`
	// Seconds remaining
	TimeRemaining *float64 `json:"time_remaining" mapstructure:"time_remaining"`
}

func (t *Module) UpdateBatteryModule() (BatteryData, error) {
	log.Info("Getting battery data")

	// Get all batteries
	batteries, err := battery.GetAll()
	// If there's an error getting battery info or no batteries found, return empty data
	// This handles both error cases and systems without batteries
	if err != nil {
		log.Debug("No battery present or error getting battery info")
		return BatteryData{}, nil
	}

	// If no batteries found, return empty data
	if len(batteries) == 0 {
		log.Debug("No batteries found")
		return BatteryData{}, nil
	}

	// Use the first battery (most systems only have one)
	bat := batteries[0]

	// Calculate percentage
	percentage := (bat.Current / bat.Full) * 100

	// Determine if charging based on state string
	isCharging := bat.State.String() == "Charging"

	// Calculate time remaining (in seconds)
	// If charging, use time until full, otherwise use time until empty
	var timeRemaining float64
	if isCharging {
		if bat.ChargeRate > 0 {
			timeRemaining = ((bat.Full - bat.Current) / bat.ChargeRate) * 3600
		}
	} else {
		if bat.ChargeRate > 0 {
			timeRemaining = (bat.Current / bat.ChargeRate) * 3600
		}
	}

	return BatteryData{
		IsCharging:    &isCharging,
		Percentage:    &percentage,
		TimeRemaining: &timeRemaining,
	}, nil
}
