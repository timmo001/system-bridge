package data_module

import "github.com/charmbracelet/log"

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

// GPUsData represents information about all GPU devices
type GPUsData struct {
	GPUs []GPU `json:"gpus"`
}

func (t *Module) UpdateGPUsModule() (GPUsData, error) {
	log.Info("Getting GPUs data")

	var gpusData GPUsData
	// Initialize arrays
	gpusData.GPUs = make([]GPU, 0)

	// TODO: Implement
	return gpusData, nil
}
