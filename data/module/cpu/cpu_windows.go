//go:build windows
// +build windows

package cpu

import (
	"bytes"
	"encoding/json"
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
	// Best-effort: Query Win32_Processor for MaxClockSpeed (MHz). Min is not generally available.
	// We shell out to PowerShell to avoid adding heavy WMI deps. If this fails, return nils.
	type psCPU struct {
		MaxClockSpeed     *float64 `json:"MaxClockSpeed"`
		CurrentClockSpeed *float64 `json:"CurrentClockSpeed"`
	}
	cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object MaxClockSpeed,CurrentClockSpeed | ConvertTo-Json")
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, nil
	}
	s := strings.TrimSpace(out.String())
	if s == "" {
		return nil, nil
	}
	// Output can be an object or array depending on CPU count
	var one psCPU
	var many []psCPU
	if strings.HasPrefix(s, "[") {
		if err := json.Unmarshal([]byte(s), &many); err != nil || len(many) == 0 {
			return nil, nil
		}
		// Use the first as representative; Windows typically reports same for all packages
		one = many[0]
	} else {
		if err := json.Unmarshal([]byte(s), &one); err != nil {
			return nil, nil
		}
	}
	// Max from MaxClockSpeed; min unknown
	if one.MaxClockSpeed != nil {
		max := *one.MaxClockSpeed
		return nil, &max
	}
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
    // Best-effort: use WMI via PowerShell to read Win32_Processor.CurrentVoltage (decivolts when bit7=0)
    cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object CurrentVoltage | ConvertTo-Json")
    var out bytes.Buffer
    cmd.Stdout = &out
    if err := cmd.Run(); err != nil {
        return nil
    }
    s := strings.TrimSpace(out.String())
    if s == "" {
        return nil
    }
    // Parse object or array
    type psVolt struct{ CurrentVoltage *float64 `json:"CurrentVoltage"` }
    var one psVolt
    var many []psVolt
    if strings.HasPrefix(s, "[") {
        if err := json.Unmarshal([]byte(s), &many); err != nil || len(many) == 0 {
            return nil
        }
        one = many[0]
    } else {
        if err := json.Unmarshal([]byte(s), &one); err != nil {
            return nil
        }
    }
    if one.CurrentVoltage == nil {
        return nil
    }
    raw := *one.CurrentVoltage
    // If bit 7 is set (>=128), actual voltage not reported
    if raw >= 128 {
        return nil
    }
    v := raw / 10.0
    return &v
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
