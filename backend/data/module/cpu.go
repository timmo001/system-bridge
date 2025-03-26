package data_module

import "github.com/charmbracelet/log"

// CPUFrequency represents CPU frequency information
type CPUFrequency struct {
	Current *float64 `json:"current,omitempty"`
	Min     *float64 `json:"min,omitempty"`
	Max     *float64 `json:"max,omitempty"`
}

// CPUStats represents CPU statistics
type CPUStats struct {
	CtxSwitches    *int64 `json:"ctx_switches,omitempty"`
	Interrupts     *int64 `json:"interrupts,omitempty"`
	SoftInterrupts *int64 `json:"soft_interrupts,omitempty"`
	Syscalls       *int64 `json:"syscalls,omitempty"`
}

// CPUTimes represents CPU timing information
type CPUTimes struct {
	User      *float64 `json:"user,omitempty"`
	System    *float64 `json:"system,omitempty"`
	Idle      *float64 `json:"idle,omitempty"`
	Interrupt *float64 `json:"interrupt,omitempty"`
	DPC       *float64 `json:"dpc,omitempty"`
}

// PerCPU represents per-CPU information
type PerCPU struct {
	ID           int           `json:"id"`
	Frequency    *CPUFrequency `json:"frequency,omitempty"`
	Power        *float64      `json:"power,omitempty"`
	Times        *CPUTimes     `json:"times,omitempty"`
	TimesPercent *CPUTimes     `json:"times_percent,omitempty"`
	Usage        *float64      `json:"usage,omitempty"`
	Voltage      *float64      `json:"voltage,omitempty"`
}

// CPUData represents overall CPU information
type CPUData struct {
	Count        *int          `json:"count,omitempty"`
	Frequency    *CPUFrequency `json:"frequency,omitempty"`
	LoadAverage  *float64      `json:"load_average,omitempty"`
	PerCPU       []PerCPU      `json:"per_cpu,omitempty"`
	Power        *float64      `json:"power,omitempty"`
	Stats        *CPUStats     `json:"stats,omitempty"`
	Temperature  *float64      `json:"temperature,omitempty"`
	Times        *CPUTimes     `json:"times,omitempty"`
	TimesPercent *CPUTimes     `json:"times_percent,omitempty"`
	Usage        *float64      `json:"usage,omitempty"`
	Voltage      *float64      `json:"voltage,omitempty"`
}

func (t *UpdateTask) UpdateCPUModule() (CPUData, error) {
	log.Info("Getting CPU data")

	// TODO: Implement
	return CPUData{}, nil
}
