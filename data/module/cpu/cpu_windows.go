//go:build windows

package cpu

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
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
	utils.SetHideWindow(cmd)
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
	var max *float64
	if one.MaxClockSpeed != nil {
		mv := *one.MaxClockSpeed
		max = &mv
	}
	// Best-effort min via power plan minimum processor state percentage
	if max != nil {
		if pct := readMinProcessorStatePercent(); pct != nil {
			v := (*max) * (*pct) / 100.0
			return &v, max
		}
	}
	return nil, max
}

func ReadCPUStats() *types.CPUStats {
	// Best-effort: Use performance counters to obtain per-second rates and
	// convert to int64 as a best-effort approximation of counts.
	// Counters may be unavailable on some systems.
	var (
		ctxSwitches    *int64
		interrupts     *int64
		softInterrupts *int64 // not available on Windows
		syscalls       *int64
	)
	if v, ok := readTypeperfCounter(`\\System\\Context Switches/sec`); ok {
		iv := int64(v)
		ctxSwitches = &iv
	}
	if v, ok := readTypeperfCounter(`\\Processor(_Total)\\Interrupts/sec`); ok {
		iv := int64(v)
		interrupts = &iv
	}
	if v, ok := readTypeperfCounter(`\\System\\System Calls/sec`); ok {
		iv := int64(v)
		syscalls = &iv
	}
	if ctxSwitches == nil && interrupts == nil && syscalls == nil {
		return nil
	}
	return &types.CPUStats{
		CtxSwitches:    ctxSwitches,
		Interrupts:     interrupts,
		SoftInterrupts: softInterrupts,
		Syscalls:       syscalls,
	}
}

func ComputeCPUPower(sample time.Duration) *float64 {
	// Best-effort: Try Windows "Power Meter" performance counters if present.
	// This object is available on some systems and exposes instantaneous power in Watts.
	// We query all instances and sum them to approximate package power.
	if vals, ok := readTypeperfCounters(`\\Power Meter(*)\\Power`); ok {
		var total float64
		for _, v := range vals {
			total += v
		}
		if total > 0 {
			return &total
		}
	}
	return nil
}

// ReadCPUVcoreVoltage attempts to read CPU core voltage on Windows using WMI.
// Returns volts if readable, otherwise nil.
func ReadCPUVcoreVoltage() *float64 {
	// Best-effort: use WMI via PowerShell to read Win32_Processor.CurrentVoltage (decivolts when bit7=0)
	cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-CimInstance -ClassName Win32_Processor | Select-Object CurrentVoltage | ConvertTo-Json")
	utils.SetHideWindow(cmd)
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
	type psVolt struct {
		CurrentVoltage *float64 `json:"CurrentVoltage"`
	}
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

// GetDPCTimeSeconds returns absolute DPC time in seconds for the provided sampling interval.
// We sample % DPC Time over a short interval and convert: seconds = (percent/100) * intervalSeconds.
func GetDPCTimeSeconds(percpu bool, sample time.Duration) []float64 {
	if sample <= 0 {
		sample = 200 * time.Millisecond
	}
	si := strconv.FormatFloat(sample.Seconds(), 'f', 3, 64)
	if percpu {
		cmd := exec.Command("typeperf", `\\Processor(*)\\% DPC Time`, "-sc", "2", "-si", si)
		utils.SetHideWindow(cmd)
		var out bytes.Buffer
		cmd.Stdout = &out
		if err := cmd.Run(); err != nil {
			return nil
		}
		lines := strings.Split(out.String(), "\n")
		// The last non-empty line contains the second sample
		last := ""
		for i := len(lines) - 1; i >= 0; i-- {
			s := strings.TrimSpace(lines[i])
			if s != "" {
				last = s
				break
			}
		}
		if last == "" {
			return nil
		}
		r := csv.NewReader(strings.NewReader(last))
		rec, err := r.Read()
		if err != nil || len(rec) < 2 {
			return nil
		}
		vals := make([]float64, 0, len(rec)-1)
		for i := 1; i < len(rec); i++ {
			s := strings.Trim(rec[i], "\" ")
			if f, err := strconv.ParseFloat(s, 64); err == nil {
				secs := f / 100.0 * sample.Seconds()
				vals = append(vals, secs)
			}
		}
		if len(vals) == 0 {
			return nil
		}
		return vals
	}
	// Overall _Total
	cmd := exec.Command("typeperf", `\\Processor(_Total)\\% DPC Time`, "-sc", "2", "-si", si)
	utils.SetHideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil
	}
	lines := strings.Split(out.String(), "\n")
	last := ""
	for i := len(lines) - 1; i >= 0; i-- {
		s := strings.TrimSpace(lines[i])
		if s != "" {
			last = s
			break
		}
	}
	if last == "" {
		return nil
	}
	r := csv.NewReader(strings.NewReader(last))
	rec, err := r.Read()
	if err != nil || len(rec) < 2 {
		return nil
	}
	s := strings.Trim(rec[len(rec)-1], "\" ")
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	secs := f / 100.0 * sample.Seconds()
	return []float64{secs}
}

func readTypeperfCounter(counter string) (float64, bool) {
	cmd := exec.Command("typeperf", counter, "-sc", "1")
	utils.SetHideWindow(cmd)
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

// readTypeperfCounters reads a wildcard counter line like "\\Object(*)\\Counter" and returns
// all numeric values from the single-sample output.
func readTypeperfCounters(counter string) ([]float64, bool) {
	cmd := exec.Command("typeperf", counter, "-sc", "1")
	utils.SetHideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil, false
	}
	lines := strings.Split(out.String(), "\n")
	if len(lines) < 3 {
		return nil, false
	}
	last := strings.TrimSpace(lines[len(lines)-1])
	if last == "" {
		last = strings.TrimSpace(lines[len(lines)-2])
	}
	// Parse CSV robustly to handle commas/quotes in timestamp
	r := csv.NewReader(strings.NewReader(last))
	rec, err := r.Read()
	if err != nil || len(rec) < 2 {
		return nil, false
	}
	// First column is timestamp; remaining columns are values for each instance
	vals := make([]float64, 0, len(rec)-1)
	for i := 1; i < len(rec); i++ {
		s := strings.Trim(rec[i], "\" ")
		if s == "" || s == "\"" {
			continue
		}
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			vals = append(vals, f)
		}
	}
	if len(vals) == 0 {
		return nil, false
	}
	return vals, true
}

// ReadCPUTemperature attempts to read CPU temperature via WMIC/PowerShell
func ReadCPUTemperature() *float64 {
	// Try MSAcpi_ThermalZoneTemperature (Kelvin*10)
	cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace root/wmi | Select-Object CurrentTemperature | ConvertTo-Json")
	utils.SetHideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil
	}
	s := strings.TrimSpace(out.String())
	if s == "" {
		return nil
	}
	type tz struct {
		CurrentTemperature *float64 `json:"CurrentTemperature"`
	}
	var one tz
	var many []tz
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
	if one.CurrentTemperature == nil || *one.CurrentTemperature <= 0 {
		return nil
	}
	// Convert from tenths of Kelvin to Celsius
	c := (*one.CurrentTemperature / 10.0) - 273.15
	return &c
}

// readMinProcessorStatePercent queries the current power plan's minimum processor state
// and returns it as a percentage (0-100) if available.
func readMinProcessorStatePercent() *float64 {
	// Query AC value first; fallback to DC. Output contains lines with hex indexes like 0x0000000a (10%).
	// Call powercfg directly and parse stdout.
	cmd := exec.Command("powercfg", "/query", "SCHEME_CURRENT", "SUB_PROCESSOR", "PROCTHROTTLEMIN")
	utils.SetHideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return nil
	}
	text := out.String()
	if text == "" {
		return nil
	}
	// Prefer AC index, then DC index
	acRe := regexp.MustCompile(`(?i)Current\s+AC\s+Power\s+Setting\s+Index:\s*0x([0-9a-f]+)`)
	dcRe := regexp.MustCompile(`(?i)Current\s+DC\s+Power\s+Setting\s+Index:\s*0x([0-9a-f]+)`)
	var hexStr string
	if m := acRe.FindStringSubmatch(text); len(m) == 2 {
		hexStr = m[1]
	} else if m := dcRe.FindStringSubmatch(text); len(m) == 2 {
		hexStr = m[1]
	} else {
		return nil
	}
	iv, err := strconv.ParseInt(hexStr, 16, 64)
	if err != nil {
		return nil
	}
	p := float64(iv)
	// Sanity bounds
	if p < 0 || p > 100 {
		return nil
	}
	return &p
}
