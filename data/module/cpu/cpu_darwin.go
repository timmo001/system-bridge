//go:build darwin
// +build darwin

package cpu

import (
	"bytes"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
)

func GetPerCPUFreqBounds(cpuIndex int) (minMHz *float64, maxMHz *float64) {
	// Best-effort via sysctl: hw.cpufrequency_max (Hz) and hw.cpufrequency_min (Hz) if present
	readSysctlFloat := func(name string) *float64 {
		cmd := exec.Command("sysctl", "-n", name)
		var out bytes.Buffer
		cmd.Stdout = &out
		if err := cmd.Run(); err != nil {
			return nil
		}
		s := strings.TrimSpace(out.String())
		if s == "" {
			return nil
		}
		v, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return nil
		}
		// Convert Hz to MHz
		mhz := v / 1_000_000.0
		return &mhz
	}
	max := readSysctlFloat("hw.cpufrequency_max")
	min := readSysctlFloat("hw.cpufrequency_min")
	return min, max
}

func ReadCPUStats() *types.CPUStats {
	// Not readily available in a portable way
	return nil
}

// Best-effort: use `powermetrics` to estimate CPU package power (may require elevated privileges).
func ComputeCPUPower(sample time.Duration) *float64 {
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "100")
	var out bytes.Buffer
	cmd.Stdout = &out
	_ = cmd.Run()
	s := out.String()
	if s == "" {
		return nil
	}
	re := regexp.MustCompile(`CPU Power:\s*([0-9]+\.?[0-9]*)\s*W`)
	m := re.FindStringSubmatch(s)
	if len(m) != 2 {
		return nil
	}
	v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64)
	if err != nil {
		return nil
	}
	return &v
}

// ReadCPUVcoreVoltage attempts to read CPU core voltage (Vcore) on macOS
// by parsing powermetrics SMC sampler output if available.
func ReadCPUVcoreVoltage() *float64 {
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "100", "--samplers", "smc")
	var out bytes.Buffer
	cmd.Stdout = &out
	_ = cmd.Run()
	s := out.String()
	if s == "" {
		return nil
	}
	// Prefer explicit CPU Vcore
	reVcore := regexp.MustCompile(`(?i)CPU\s*Vcore:\s*([0-9]+\.?[0-9]*)\s*V`)
	if m := reVcore.FindStringSubmatch(s); len(m) == 2 {
		if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
			return &v
		}
	}
	// Fallback: first Voltage value in SMC section
	reAny := regexp.MustCompile(`(?i)voltage[^\n]*?([0-9]+\.?[0-9]*)\s*V`)
	if m := reAny.FindStringSubmatch(s); len(m) == 2 {
		if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
			return &v
		}
	}
	return nil
}

// GetDPCPercentages not supported on macOS; return nil best-effort.
func GetDPCPercentages(percpu bool) []float64 { return nil }

// GetDPCTimeSeconds not supported on macOS; return nil.
func GetDPCTimeSeconds(percpu bool, sample time.Duration) []float64 { return nil }

// ReadCPUTemperature attempts to read CPU temperature via powermetrics SMC sampler
func ReadCPUTemperature() *float64 {
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "100", "--samplers", "smc")
	var out bytes.Buffer
	cmd.Stdout = &out
	_ = cmd.Run()
	s := out.String()
	if s == "" {
		return nil
	}
	// Example patterns: "CPU die temperature: 65.25 C"
	re := regexp.MustCompile(`(?i)CPU\s+die\s+temperature:\s*([0-9]+\.?[0-9]*)\s*C`)
	if m := re.FindStringSubmatch(s); len(m) == 2 {
		if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
			return &v
		}
	}
	return nil
}
