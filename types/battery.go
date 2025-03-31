package types

// BatteryData represents battery information
type BatteryData struct {
	IsCharging    *bool    `json:"is_charging"`
	Percentage    *float64 `json:"percentage"`
	TimeRemaining *float64 `json:"time_remaining"` // Seconds remaining
}
