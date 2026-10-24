package types

// GPU represents information about a GPU device
type GPU struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	CoreClock        *float64 `json:"core_clock"`
	CoreLoad         *float64 `json:"core_load"`
	DecoderLoad      *float64 `json:"decoder_load"`
	EncoderLoad      *float64 `json:"encoder_load"`
	FanSpeed         *float64 `json:"fan_speed"`
	FanSpeedPercent  *float64 `json:"fan_speed_percent"`
	MemoryClock      *float64 `json:"memory_clock"`
	MemoryLoad       *float64 `json:"memory_load"`
	MemoryFree       *float64 `json:"memory_free"`
	MemoryUsed       *float64 `json:"memory_used"`
	MemoryTotal      *float64 `json:"memory_total"`
	PerformanceState *string  `json:"performance_state"`
	PowerLimit       *float64 `json:"power_limit"`
	PowerUsage       *float64 `json:"power_usage"`
	Temperature      *float64 `json:"temperature"`
}

// GPUsData represents information about all GPU devices
type GPUsData = []GPU
