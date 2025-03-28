package types

// Process represents information about a system process
type Process struct {
	ID               float64  `json:"id"`
	Name             *string  `json:"name"`
	CPUUsage         *float64 `json:"cpu_usage"`
	Created          *float64 `json:"created"`
	MemoryUsage      *float64 `json:"memory_usage"`
	Path             *string  `json:"path"`
	Status           *string  `json:"status"`
	Username         *string  `json:"username"`
	WorkingDirectory *string  `json:"working_directory"`
}

// ProcessesData represents information about all system processes
type ProcessesData struct {
	Processes []Process `json:"processes"`
}
