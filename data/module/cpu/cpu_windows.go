//go:build windows
// +build windows

package cpu

import (
	"time"

	"github.com/timmo001/system-bridge/types"
)

// Best-effort via Windows PDH counters could be used; for now attempt to query GetSystemTimes deltas
// to fill stats fields where possible, and skip power.

func GetPerCPUFreqBounds(cpuIndex int) (minMHz *float64, maxMHz *float64) {
	// Best-effort: Windows per-core min/max not readily available without WMI/PowerCfg; return nils
	return nil, nil
}

func ReadCPUStats() *types.CPUStats {
	// Best-effort: Windows overall stats (ctx switches/interrupts) require PDH/NT queries; omit for now
	return nil
}

func ComputeCPUPower(sample time.Duration) *float64 {
	// Best-effort: No generic power interface available here; skip
	return nil
}

// ReadCPUVcoreVoltage attempts to read CPU core voltage on Windows using WMI.
// Returns volts if readable, otherwise nil.
func ReadCPUVcoreVoltage() *float64 {
    // Best-effort: Windows requires WMI/PDH; not implemented here.
    return nil
}
