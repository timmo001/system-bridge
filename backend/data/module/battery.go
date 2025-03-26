package data_module

import "github.com/charmbracelet/log"

// BatteryData represents battery information
type BatteryData struct {
	IsCharging    bool    `json:"is_charging" mapstructure:"is_charging"`
	Percentage    float64 `json:"percentage" mapstructure:"percentage"`
	TimeRemaining float64 `json:"time_remaining" mapstructure:"time_remaining"`
}

func (t *UpdateTask) UpdateBatteryModule() (BatteryData, error) {
	log.Info("Getting battery data")

	// TODO: Implement
	return BatteryData{
		IsCharging:    false,
		Percentage:    50.0,
		TimeRemaining: 100.0,
	}, nil
}
