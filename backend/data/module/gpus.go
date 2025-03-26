package data_module

import "github.com/charmbracelet/log"

// GPU represents information about a GPU device
type GPU struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	CoreClock   *float64 `json:"core_clock,omitempty"`
	CoreLoad    *float64 `json:"core_load,omitempty"`
	FanSpeed    *float64 `json:"fan_speed,omitempty"`
	MemoryClock *float64 `json:"memory_clock,omitempty"`
	MemoryLoad  *float64 `json:"memory_load,omitempty"`
	MemoryFree  *float64 `json:"memory_free,omitempty"`
	MemoryUsed  *float64 `json:"memory_used,omitempty"`
	MemoryTotal *float64 `json:"memory_total,omitempty"`
	PowerUsage  *float64 `json:"power_usage,omitempty"`
	Temperature *float64 `json:"temperature,omitempty"`
}

// GPUsData represents information about all GPU devices
type GPUsData struct {
	GPUs []GPU `json:"gpus"`
}

func (t *UpdateTask) UpdateGPUsModule() (GPUsData, error) {
	log.Info("Getting GPUs data")

	// TODO: Implement
	return GPUsData{}, nil
}
