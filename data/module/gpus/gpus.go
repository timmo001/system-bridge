package gpus

// GPU represents information about a GPU device
type GPU struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	CoreClock   *float64 `json:"core_clock"`
	CoreLoad    *float64 `json:"core_load"`
	FanSpeed    *float64 `json:"fan_speed"`
	MemoryClock *float64 `json:"memory_clock"`
	MemoryLoad  *float64 `json:"memory_load"`
	MemoryFree  *float64 `json:"memory_free"`
	MemoryUsed  *float64 `json:"memory_used"`
	MemoryTotal *float64 `json:"memory_total"`
	PowerUsage  *float64 `json:"power_usage"`
	Temperature *float64 `json:"temperature"`
}

// GetGPUs returns information about all GPU devices
func GetGPUs() ([]GPU, error) {
	return getGPUs()
}
