//go:build windows
// +build windows

package cpu

import (
	"bytes"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
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

// GetDPCPercentages returns % DPC Time either per-CPU or overall using typeperf.
func GetDPCPercentages(percpu bool) []float64 {
    if percpu {
        count, err := cpu.Counts(true)
        if err != nil || count <= 0 {
            return nil
        }
        values := make([]float64, count)
        for i := 0; i < count; i++ {
            v, ok := readTypeperfCounter(`\\Processor(` + strconv.Itoa(i) + `)\\% DPC Time`)
            if !ok {
                return nil
            }
            values[i] = v
        }
        return values
    }
    if v, ok := readTypeperfCounter(`\\Processor(_Total)\\% DPC Time`); ok {
        return []float64{v}
    }
    return nil
}

func readTypeperfCounter(counter string) (float64, bool) {
    cmd := exec.Command("typeperf", counter, "-sc", "1")
    var out bytes.Buffer
    cmd.Stdout = &out
    if err := cmd.Run(); err != nil {
        return 0, false
    }
    lines := strings.Split(out.String(), "\n")
    if len(lines) < 3 {
        return 0, false
    }
    // Typically: First line header, second line column names, third line values
    last := strings.TrimSpace(lines[len(lines)-1])
    if last == "" {
        last = strings.TrimSpace(lines[len(lines)-2])
    }
    // CSV like: "timestamp","value"
    parts := strings.Split(last, ",")
    if len(parts) < 2 {
        return 0, false
    }
    val := strings.Trim(parts[len(parts)-1], "\" ")
    f, err := strconv.ParseFloat(val, 64)
    if err != nil {
        return 0, false
    }
    return f, true
}
