package types

// CPUFrequency represents CPU frequency information
type CPUFrequency struct {
	Current *float64 `json:"current"`
	Min     *float64 `json:"min"`
	Max     *float64 `json:"max"`
}

// CPUStats represents CPU statistics
type CPUStats struct {
	CtxSwitches    *int64 `json:"ctx_switches"`    // Context switches count
	Interrupts     *int64 `json:"interrupts"`      // Hardware interrupts count
	SoftInterrupts *int64 `json:"soft_interrupts"` // Software interrupts count
	Syscalls       *int64 `json:"syscalls"`        // System calls count
}

// CPUTimes represents CPU timing information
type CPUTimes struct {
	User      *float64 `json:"user"`
	System    *float64 `json:"system"`
	Idle      *float64 `json:"idle"`
	Interrupt *float64 `json:"interrupt"`
	DPC       *float64 `json:"dpc"`
}

// PerCPU represents per-CPU information
type PerCPU struct {
	ID           int           `json:"id"`
	Frequency    *CPUFrequency `json:"frequency"`
	Power        *float64      `json:"power"`
	Times        *CPUTimes     `json:"times"`
	TimesPercent *CPUTimes     `json:"times_percent"`
	Usage        *float64      `json:"usage"`
	Voltage      *float64      `json:"voltage"`
}

// CPUData represents overall CPU information
type CPUData struct {
	Count        *int          `json:"count"`
	Frequency    *CPUFrequency `json:"frequency"`
	LoadAverage  *float64      `json:"load_average"`
	PerCPU       []PerCPU      `json:"per_cpu"`
	Power        *float64      `json:"power"`
	Stats        *CPUStats     `json:"stats"`
	Temperature  *float64      `json:"temperature"`
	Times        *CPUTimes     `json:"times"`
	TimesPercent *CPUTimes     `json:"times_percent"`
	Usage        *float64      `json:"usage"`
	Voltage      *float64      `json:"voltage"`
}
