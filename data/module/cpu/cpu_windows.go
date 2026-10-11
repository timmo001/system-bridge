//go:build windows

package cpu

import (
	"bytes"
	"encoding/json"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// Every reading here shells out to typeperf, PowerShell or powercfg, and a
// process start on Windows costs far more than the value it returns. So each
// metric group is gathered with one command per update, static values are
// cached, and a counter or WMI class that is missing on this machine is not
// retried on every update.
const (
	// processorInfoTTL keeps the Win32_Processor query, which backs both the
	// frequency bounds and the voltage, to one PowerShell run per update.
	processorInfoTTL = 30 * time.Second
	// staticTTL is for values that only change with hardware or power plan.
	staticTTL = 10 * time.Minute
	// unavailableTTL is how long to wait before retrying a source that failed.
	unavailableTTL = 10 * time.Minute
	// typeperfWindow is typeperf's default interval between its two samples.
	typeperfWindow = time.Second
)

type win32Processor struct {
	MaxClockSpeed     *float64 `json:"MaxClockSpeed"`
	CurrentClockSpeed *float64 `json:"CurrentClockSpeed"`
	CurrentVoltage    *float64 `json:"CurrentVoltage"`
}

var (
	processorInfoCache     = utils.TTLValue[win32Processor]{TTL: processorInfoTTL, FailTTL: unavailableTTL}
	minProcessorStateCache = utils.TTLValue[float64]{TTL: staticTTL, FailTTL: staticTTL}
	powerMeterCache        = utils.TTLValue[float64]{FailTTL: unavailableTTL}
	thermalZoneCache       = utils.TTLValue[float64]{FailTTL: unavailableTTL}
)

// runCommand runs a hidden console command and returns its stdout.
func runCommand(name string, args ...string) (string, bool) {
	cmd := exec.Command(name, args...)
	utils.SetHideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", false
	}
	return out.String(), true
}

// queryProcessorInfo returns the first Win32_Processor entry. Windows reports
// the same clock limits for every package, so one entry is representative.
func queryProcessorInfo() (win32Processor, bool) {
	return processorInfoCache.Get(func() (win32Processor, bool) {
		out, ok := runCommand("powershell", "-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object MaxClockSpeed,CurrentClockSpeed,CurrentVoltage | ConvertTo-Json")
		if !ok {
			return win32Processor{}, false
		}
		s := strings.TrimSpace(out)
		if s == "" {
			return win32Processor{}, false
		}
		// Output is an object for one package and an array for several
		if strings.HasPrefix(s, "[") {
			var many []win32Processor
			if err := json.Unmarshal([]byte(s), &many); err != nil || len(many) == 0 {
				return win32Processor{}, false
			}
			return many[0], true
		}
		var one win32Processor
		if err := json.Unmarshal([]byte(s), &one); err != nil {
			return win32Processor{}, false
		}
		return one, true
	})
}

// GetPerCPUFreqBounds returns the processor's maximum clock from WMI and, as
// a best-effort minimum, the power plan's minimum processor state applied to
// it. Windows reports the same limits for every logical CPU.
func GetPerCPUFreqBounds(cpuIndex int) (minMHz *float64, maxMHz *float64) {
	info, ok := queryProcessorInfo()
	if !ok || info.MaxClockSpeed == nil {
		return nil, nil
	}
	max := *info.MaxClockSpeed
	if pct, ok := minProcessorStateCache.Get(readMinProcessorStatePercent); ok {
		min := max * pct / 100.0
		return &min, &max
	}
	return nil, &max
}

// ReadCPUStats reads per-second system rates from one typeperf run and
// reports them as counts, as a best-effort approximation.
func ReadCPUStats() *types.CPUStats {
	const (
		ctxCounter  = `\System\Context Switches/sec`
		intrCounter = `\Processor(_Total)\Interrupts/sec`
		sysCounter  = `\System\System Calls/sec`
	)
	values, ok := typeperfValues(ctxCounter, intrCounter, sysCounter)
	if !ok {
		return nil
	}
	toCount := func(suffix string) *int64 {
		for path, v := range values {
			if strings.HasSuffix(strings.ToLower(path), strings.ToLower(suffix)) {
				iv := int64(v)
				return &iv
			}
		}
		return nil
	}
	stats := &types.CPUStats{
		CtxSwitches: toCount(ctxCounter),
		Interrupts:  toCount(intrCounter),
		Syscalls:    toCount(sysCounter),
	}
	if stats.CtxSwitches == nil && stats.Interrupts == nil && stats.Syscalls == nil {
		return nil
	}
	return stats
}

// ComputeCPUPower sums the "Power Meter" performance counters, which some
// systems expose in Watts. Most do not, so a failure is remembered.
func ComputeCPUPower(sample time.Duration) *float64 {
	total, ok := powerMeterCache.Get(func() (float64, bool) {
		values, ok := typeperfValues(`\Power Meter(*)\Power`)
		if !ok {
			return 0, false
		}
		var total float64
		for _, v := range values {
			total += v
		}
		return total, total > 0
	})
	if !ok {
		return nil
	}
	return &total
}

// ReadCPUVcoreVoltage reads Win32_Processor.CurrentVoltage, which is in
// decivolts when bit 7 is clear.
func ReadCPUVcoreVoltage() *float64 {
	info, ok := queryProcessorInfo()
	if !ok || info.CurrentVoltage == nil {
		return nil
	}
	raw := *info.CurrentVoltage
	// If bit 7 is set (>=128), actual voltage not reported
	if raw >= 128 {
		return nil
	}
	v := raw / 10.0
	return &v
}

// SampleDPC reads % DPC Time for every processor instance, including
// _Total, from a single typeperf run.
func SampleDPC(sample time.Duration) DPCSample {
	out := DPCSample{Window: typeperfWindow}
	values, ok := typeperfValues(`\Processor(*)\% DPC Time`)
	if !ok {
		return out
	}
	byIndex := make(map[int]float64, len(values))
	maxIndex := -1
	for path, v := range values {
		instance := typeperfInstance(path)
		if strings.EqualFold(instance, "_Total") {
			total := v
			out.TotalPercent = &total
			continue
		}
		idx, err := strconv.Atoi(instance)
		if err != nil || idx < 0 {
			continue
		}
		byIndex[idx] = v
		if idx > maxIndex {
			maxIndex = idx
		}
	}
	if maxIndex >= 0 {
		out.PerCPUPercent = make([]float64, maxIndex+1)
		for idx, v := range byIndex {
			out.PerCPUPercent[idx] = v
		}
	}
	return out
}

// typeperfValues collects the given counters once and returns the value of
// each expanded counter path from the last sample row. Wildcard instances
// expand to one column each.
func typeperfValues(counters ...string) (map[string]float64, bool) {
	args := append(append([]string{}, counters...), "-sc", "1")
	out, ok := runCommand("typeperf", args...)
	if !ok {
		return nil, false
	}
	return parseTypeperfCSV(out)
}

// ReadCPUTemperature reads the ACPI thermal zone through WMI. It is only
// available on some machines, so a failure is remembered.
func ReadCPUTemperature() *float64 {
	c, ok := thermalZoneCache.Get(func() (float64, bool) {
		out, ok := runCommand("powershell", "-NoProfile", "-Command", "Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace root/wmi | Select-Object CurrentTemperature | ConvertTo-Json")
		if !ok {
			return 0, false
		}
		s := strings.TrimSpace(out)
		if s == "" {
			return 0, false
		}
		type tz struct {
			CurrentTemperature *float64 `json:"CurrentTemperature"`
		}
		var one tz
		if strings.HasPrefix(s, "[") {
			var many []tz
			if err := json.Unmarshal([]byte(s), &many); err != nil || len(many) == 0 {
				return 0, false
			}
			one = many[0]
		} else if err := json.Unmarshal([]byte(s), &one); err != nil {
			return 0, false
		}
		if one.CurrentTemperature == nil || *one.CurrentTemperature <= 0 {
			return 0, false
		}
		// Convert from tenths of Kelvin to Celsius
		return (*one.CurrentTemperature / 10.0) - 273.15, true
	})
	if !ok {
		return nil
	}
	return &c
}

var (
	acIndexRegex = regexp.MustCompile(`(?i)Current\s+AC\s+Power\s+Setting\s+Index:\s*0x([0-9a-f]+)`)
	dcIndexRegex = regexp.MustCompile(`(?i)Current\s+DC\s+Power\s+Setting\s+Index:\s*0x([0-9a-f]+)`)
)

// readMinProcessorStatePercent queries the current power plan's minimum
// processor state as a percentage, preferring the AC value.
func readMinProcessorStatePercent() (float64, bool) {
	text, ok := runCommand("powercfg", "/query", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMIN")
	if !ok || text == "" {
		return 0, false
	}
	var hexStr string
	if m := acIndexRegex.FindStringSubmatch(text); len(m) == 2 {
		hexStr = m[1]
	} else if m := dcIndexRegex.FindStringSubmatch(text); len(m) == 2 {
		hexStr = m[1]
	} else {
		return 0, false
	}
	iv, err := strconv.ParseInt(hexStr, 16, 64)
	if err != nil {
		return 0, false
	}
	p := float64(iv)
	if p < 0 || p > 100 {
		return 0, false
	}
	return p, true
}
