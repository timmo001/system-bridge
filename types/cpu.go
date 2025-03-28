package types

// CPUFrequency represents CPU frequency information
type CPUFrequency struct {
	Current *float64 `json:"current"`
	Min     *float64 `json:"min"`     // TODO: Implement minimum frequency detection
	Max     *float64 `json:"max"`     // TODO: Implement maximum frequency detection
}

// CPUStats represents CPU statistics
type CPUStats struct {
	// TODO: Implement CPU statistics collection
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
	DPC       *float64 `json:"dpc"` // TODO: Implement Deferred Procedure Call time tracking
}

// PerCPU represents per-CPU information
type PerCPU struct {
	ID           int           `json:"id"`
	Frequency    *CPUFrequency `json:"frequency"`
	Power        *float64      `json:"power"`      // TODO: Implement per-CPU power consumption monitoring
	Times        *CPUTimes     `json:"times"`
	TimesPercent *CPUTimes     `json:"times_percent"` // TODO: Implement per-CPU time percentage calculations
	Usage        *float64      `json:"usage"`
	Voltage      *float64      `json:"voltage"` // TODO: Implement per-CPU voltage monitoring
}

// CPUData represents overall CPU information
type CPUData struct {
	Count        *int          `json:"count"`
	Frequency    *CPUFrequency `json:"frequency"`
	LoadAverage  *float64      `json:"load_average"`
	PerCPU       []PerCPU      `json:"per_cpu"`
	Power        *float64      `json:"power"`      // TODO: Implement overall CPU power consumption monitoring
	Stats        *CPUStats     `json:"stats"`      // TODO: Implement overall CPU statistics collection
	Temperature  *float64      `json:"temperature"`
	Times        *CPUTimes     `json:"times"`
	TimesPercent *CPUTimes     `json:"times_percent"` // TODO: Implement overall CPU time percentage calculations
	Usage        *float64      `json:"usage"`
	Voltage      *float64      `json:"voltage"` // TODO: Implement overall CPU voltage monitoring
}
