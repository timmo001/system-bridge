package types

// BatteryState is what a battery is doing right now
type BatteryState string

const (
	BatteryStateCharging    BatteryState = "charging"
	BatteryStateDischarging BatteryState = "discharging"
	BatteryStateFull        BatteryState = "full"
	BatteryStateNotCharging BatteryState = "not_charging"
	BatteryStateEmpty       BatteryState = "empty"
	BatteryStateUnknown     BatteryState = "unknown"
)

// BatteryScope says whether a battery powers the system or a connected
// device, such as a wireless mouse or headset
type BatteryScope string

const (
	BatteryScopeSystem BatteryScope = "system"
	BatteryScopeDevice BatteryScope = "device"
)

// BatteryInfo represents a single battery
type BatteryInfo struct {
	Name          string       `json:"name"`
	Model         *string      `json:"model"`
	Scope         BatteryScope `json:"scope"`
	State         BatteryState `json:"state"`
	Percentage    *float64     `json:"percentage"`
	TimeRemaining *float64     `json:"time_remaining"` // Seconds remaining
	Power         *float64     `json:"power"`          // Watts, charging or discharging
	Voltage       *float64     `json:"voltage"`        // Volts
}

// BatteryData represents battery information. The top-level battery fields
// are for the first system battery.
type BatteryData struct {
	IsCharging    *bool         `json:"is_charging"`
	Percentage    *float64      `json:"percentage"`
	TimeRemaining *float64      `json:"time_remaining"` // Seconds remaining
	State         *BatteryState `json:"state"`
	Power         *float64      `json:"power"`   // Watts, charging or discharging
	Voltage       *float64      `json:"voltage"` // Volts
	ACConnected   *bool         `json:"ac_connected"`
	Batteries     []BatteryInfo `json:"batteries"`
}
