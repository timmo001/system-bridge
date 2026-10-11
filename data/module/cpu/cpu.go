package cpu

import "time"

// FreqBounds is the minimum and maximum clock of a logical CPU in MHz. Either
// value is nil when the platform does not report it.
type FreqBounds struct {
	Min *float64
	Max *float64
}

// DPCSample holds the deferred procedure call time Windows measured over one
// sampling window. Other platforms return an empty sample.
type DPCSample struct {
	// PerCPUPercent is the percentage of the window each logical CPU spent
	// in DPCs, indexed by CPU.
	PerCPUPercent []float64
	// TotalPercent is the percentage over all CPUs, when known.
	TotalPercent *float64
	// Window is how long the percentages were measured over.
	Window time.Duration
}

// Seconds converts a DPC percentage into seconds spent in DPCs during the
// sampling window.
func (s DPCSample) Seconds(percent float64) float64 {
	return percent / 100.0 * s.Window.Seconds()
}
