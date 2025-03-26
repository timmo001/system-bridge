package data_module

import "github.com/charmbracelet/log"

// Process represents information about a system process
type Process struct {
	ID               float64  `json:"id"`
	Name             *string  `json:"name,omitempty"`
	CPUUsage         *float64 `json:"cpu_usage,omitempty"`
	Created          *float64 `json:"created,omitempty"`
	MemoryUsage      *float64 `json:"memory_usage,omitempty"`
	Path             *string  `json:"path,omitempty"`
	Status           *string  `json:"status,omitempty"`
	Username         *string  `json:"username,omitempty"`
	WorkingDirectory *string  `json:"working_directory,omitempty"`
}

// ProcessesData represents information about all system processes
type ProcessesData struct {
	Processes []Process `json:"processes"`
}

func (t *UpdateTask) UpdateProcessesModule() (ProcessesData, error) {
	log.Info("Getting processes data")

	// TODO: Implement
	return ProcessesData{}, nil
}
