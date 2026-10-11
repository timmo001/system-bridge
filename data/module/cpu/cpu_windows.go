//go:build windows

package cpu

import (
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// Every reading here shells out to typeperf, PowerShell or powercfg, and a
// process start on Windows costs far more than the value it returns. So the
// performance counters are read with one typeperf run per update, the
// Win32_Processor query is shared by its readers, and a counter or WMI class
// that is missing on this machine is not retried on every update.
const (
	// sharedTTL lets the readers of one update share a single command run
	// without serving a later update stale values.
	sharedTTL = 30 * time.Second
	// unavailableTTL is how long to wait before retrying a source that failed.
	unavailableTTL = 10 * time.Minute
	// typeperfWindow is typeperf's default interval between its two samples.
	typeperfWindow = time.Second

	dpcCounter  = `\Processor(*)\% DPC Time`
	ctxCounter  = `\System\Context Switches/sec`
	intrCounter = `\Processor(_Total)\Interrupts/sec`
	sysCounter  = `\System\System Calls/sec`
)

type win32Processor struct {
	MaxClockSpeed     *float64 `json:"MaxClockSpeed"`
	CurrentClockSpeed *float64 `json:"CurrentClockSpeed"`
	CurrentVoltage    *float64 `json:"CurrentVoltage"`
}

var (
	processorInfoCache = utils.TTLValue[win32Processor]{TTL: sharedTTL, FailTTL: unavailableTTL}
	countersCache      = utils.TTLValue[map[string]float64]{TTL: 2 * time.Second, FailTTL: time.Minute}
	powerMeterCache    = utils.TTLValue[float64]{FailTTL: unavailableTTL}
	thermalZoneCache   = utils.TTLValue[float64]{FailTTL: unavailableTTL}
)

// queryProcessorInfo returns the first Win32_Processor entry. Windows reports
// the same clock limits for every package, so one entry is representative.
func queryProcessorInfo() (win32Processor, bool) {
	return processorInfoCache.Get(func() (win32Processor, bool) {
		out, ok := utils.RunHidden("powershell", "-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object MaxClockSpeed,CurrentClockSpeed,CurrentVoltage | ConvertTo-Json")
		if !ok {
			return win32Processor{}, false
		}
		return utils.DecodeFirstJSON[win32Processor](out)
	})
}

// FreqBoundsPerCPU returns the processor's maximum clock from WMI and, as a
// best-effort minimum, the power plan's minimum processor state applied to
// it. Windows reports the same limits for every logical CPU.
func FreqBoundsPerCPU(count int) []FreqBounds {
	var b FreqBounds
	if info, ok := queryProcessorInfo(); ok && info.MaxClockSpeed != nil {
		max := *info.MaxClockSpeed
		b.Max = &max
		if pct, ok := readMinProcessorStatePercent(); ok {
			min := max * pct / 100.0
			b.Min = &min
		}
	}
	return repeatBounds(count, b)
}

// systemCounters collects the DPC and system rate counters in one typeperf
// run shared by the readers of one update.
func systemCounters() (map[string]float64, bool) {
	return countersCache.Get(func() (map[string]float64, bool) {
		return typeperfValues(dpcCounter, ctxCounter, intrCounter, sysCounter)
	})
}

// counterValue finds a counter by the end of its expanded path, which
// typeperf prefixes with the machine name.
func counterValue(values map[string]float64, counter string) (float64, bool) {
	for path, v := range values {
		if strings.HasSuffix(strings.ToLower(path), strings.ToLower(counter)) {
			return v, true
		}
	}
	return 0, false
}

// ReadCPUStats reports per-second system rates as counts, as a best-effort
// approximation.
func ReadCPUStats() *types.CPUStats {
	values, ok := systemCounters()
	if !ok {
		return nil
	}
	toCount := func(counter string) *int64 {
		v, ok := counterValue(values, counter)
		if !ok {
			return nil
		}
		iv := int64(v)
		return &iv
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

// SampleDPC reads % DPC Time for every processor instance, including
// _Total, from the shared typeperf run.
func SampleDPC() DPCSample {
	out := DPCSample{Window: typeperfWindow}
	values, ok := systemCounters()
	if !ok {
		return out
	}
	byIndex := make(map[int]float64)
	maxIndex := -1
	for path, v := range values {
		if !strings.HasSuffix(strings.ToLower(path), `\% dpc time`) {
			continue
		}
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

// typeperfValues collects the given counters once and returns the value of
// each expanded counter path from the last sample row. Wildcard instances
// expand to one column each.
func typeperfValues(counters ...string) (map[string]float64, bool) {
	args := append(append([]string{}, counters...), "-sc", "1")
	out, ok := utils.RunHidden("typeperf", args...)
	if !ok {
		return nil, false
	}
	return parseTypeperfCSV(out)
}

// ReadCPUTemperature reads the ACPI thermal zone through WMI. It is only
// available on some machines, so a failure is remembered. The GPU module
// uses the same reading as its fallback.
func ReadCPUTemperature() *float64 {
	c, ok := thermalZoneCache.Get(func() (float64, bool) {
		out, ok := utils.RunHidden("powershell", "-NoProfile", "-Command", "Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace root/wmi | Select-Object CurrentTemperature | ConvertTo-Json")
		if !ok {
			return 0, false
		}
		type tz struct {
			CurrentTemperature *float64 `json:"CurrentTemperature"`
		}
		zone, ok := utils.DecodeFirstJSON[tz](out)
		if !ok || zone.CurrentTemperature == nil || *zone.CurrentTemperature <= 0 {
			return 0, false
		}
		// Convert from tenths of Kelvin to Celsius
		return (*zone.CurrentTemperature / 10.0) - 273.15, true
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
	text, ok := utils.RunHidden("powercfg", "/query", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMIN")
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
