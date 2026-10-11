//go:build windows

package cpu

import (
	"strconv"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// Every reading here is taken in process, through PDH, WMI or the power
// API. Starting typeperf, PowerShell or powercfg for them meant several new
// processes a minute, which slowly grew Windows' kernel memory use. The
// performance counters are read once per update, the Win32_Processor query
// is shared by its readers, and a counter or WMI class that is missing on
// this machine is not retried on every update.
const (
	// sharedTTL lets the readers of one update share a single query without
	// serving a later update stale values.
	sharedTTL = 30 * time.Second
	// unavailableTTL is how long to wait before retrying a source that failed.
	unavailableTTL = 10 * time.Minute

	dpcCounter  = `\Processor(*)\% DPC Time`
	ctxCounter  = `\System\Context Switches/sec`
	intrCounter = `\Processor(_Total)\Interrupts/sec`
	sysCounter  = `\System\System Calls/sec`
)

type win32Processor struct {
	MaxClockSpeed  *uint32
	CurrentVoltage *uint16
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
		var processors []win32Processor
		if err := utils.QueryWMI("", "SELECT MaxClockSpeed, CurrentVoltage FROM Win32_Processor", &processors); err != nil || len(processors) == 0 {
			return win32Processor{}, false
		}
		return processors[0], true
	})
}

// FreqBoundsPerCPU returns the processor's maximum clock from WMI and, as a
// best-effort minimum, the power plan's minimum processor state applied to
// it. Windows reports the same limits for every logical CPU.
func FreqBoundsPerCPU(count int) []FreqBounds {
	var b FreqBounds
	if info, ok := queryProcessorInfo(); ok && info.MaxClockSpeed != nil {
		max := float64(*info.MaxClockSpeed)
		b.Max = &max
		if pct, ok := readMinProcessorStatePercent(); ok {
			min := max * pct / 100.0
			b.Min = &min
		}
	}
	return repeatBounds(count, b)
}

// systemCounters collects the DPC and system rate counters in one PDH query
// shared by the readers of one update.
func systemCounters() (map[string]float64, bool) {
	return countersCache.Get(func() (map[string]float64, bool) {
		return pdhValues(dpcCounter, ctxCounter, intrCounter, sysCounter)
	})
}

// counterValue finds a counter by the end of its expanded path.
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
// _Total, from the shared PDH query.
func SampleDPC() DPCSample {
	out := DPCSample{Window: pdhSampleWindow}
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
		instance := counterInstance(path)
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
		values, ok := pdhValues(`\Power Meter(*)\Power`)
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
	raw := float64(*info.CurrentVoltage)
	// If bit 7 is set (>=128), actual voltage not reported
	if raw >= 128 {
		return nil
	}
	v := raw / 10.0
	return &v
}

// ReadCPUTemperature reads the ACPI thermal zone through WMI. It is only
// available on some machines, so a failure is remembered. The GPU module
// uses the same reading as its fallback.
func ReadCPUTemperature() *float64 {
	c, ok := thermalZoneCache.Get(func() (float64, bool) {
		var zones []struct {
			CurrentTemperature *uint32
		}
		if err := utils.QueryWMI(`root\wmi`, "SELECT CurrentTemperature FROM MSAcpi_ThermalZoneTemperature", &zones); err != nil || len(zones) == 0 {
			return 0, false
		}
		temp := zones[0].CurrentTemperature
		if temp == nil || *temp == 0 {
			return 0, false
		}
		// Convert from tenths of Kelvin to Celsius
		return (float64(*temp) / 10.0) - 273.15, true
	})
	if !ok {
		return nil
	}
	return &c
}

var (
	modPowrprof               = windows.NewLazySystemDLL("powrprof.dll")
	procPowerGetActiveScheme  = modPowrprof.NewProc("PowerGetActiveScheme")
	procPowerReadACValueIndex = modPowrprof.NewProc("PowerReadACValueIndex")
	procPowerReadDCValueIndex = modPowrprof.NewProc("PowerReadDCValueIndex")

	// GUID_PROCESSOR_SETTINGS_SUBGROUP and GUID_PROCESSOR_THROTTLE_MINIMUM
	processorSettingsSubgroup = windows.GUID{Data1: 0x54533251, Data2: 0x82be, Data3: 0x4824, Data4: [8]byte{0x96, 0xc1, 0x47, 0xb6, 0x0b, 0x74, 0x0d, 0x00}}
	processorThrottleMinimum  = windows.GUID{Data1: 0x893dee8e, Data2: 0x2bef, Data3: 0x41e0, Data4: [8]byte{0x89, 0xc6, 0xb5, 0x5d, 0x09, 0x29, 0x96, 0x4c}}
)

// readMinProcessorStatePercent reads the active power plan's minimum
// processor state as a percentage, preferring the AC value.
func readMinProcessorStatePercent() (float64, bool) {
	if !procsAvailable(procPowerGetActiveScheme, procPowerReadACValueIndex, procPowerReadDCValueIndex) {
		return 0, false
	}
	var scheme *windows.GUID
	if r, _, _ := procPowerGetActiveScheme.Call(0, uintptr(unsafe.Pointer(&scheme))); r != 0 || scheme == nil {
		return 0, false
	}
	defer func() { _, _ = windows.LocalFree(windows.Handle(unsafe.Pointer(scheme))) }()

	for _, read := range []*windows.LazyProc{procPowerReadACValueIndex, procPowerReadDCValueIndex} {
		var value uint32
		r, _, _ := read.Call(0,
			uintptr(unsafe.Pointer(scheme)),
			uintptr(unsafe.Pointer(&processorSettingsSubgroup)),
			uintptr(unsafe.Pointer(&processorThrottleMinimum)),
			uintptr(unsafe.Pointer(&value)))
		if r != 0 {
			continue
		}
		if value > 100 {
			return 0, false
		}
		return float64(value), true
	}
	return 0, false
}
