//go:build darwin

package cpu

import (
	"bytes"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

const (
	// powermetricsTTL lets one powermetrics run serve the power, voltage and
	// temperature readers of the same update.
	powermetricsTTL = 5 * time.Second
	// unavailableTTL is how long to wait before retrying a tool that failed,
	// for example powermetrics without root.
	unavailableTTL = 10 * time.Minute
)

type freqBounds struct {
	min *float64
	max *float64
}

var (
	freqBoundsCache   = utils.TTLValue[freqBounds]{TTL: time.Hour, FailTTL: time.Hour}
	powermetricsCache = utils.TTLValue[string]{TTL: powermetricsTTL, FailTTL: unavailableTTL}

	cpuPowerRegex    = regexp.MustCompile(`CPU Power:\s*([0-9]+\.?[0-9]*)\s*(m?)W`)
	cpuVcoreRegex    = regexp.MustCompile(`(?i)CPU\s*Vcore:\s*([0-9]+\.?[0-9]*)\s*V`)
	anyVoltageRegex  = regexp.MustCompile(`(?i)voltage[^\n]*?([0-9]+\.?[0-9]*)\s*V`)
	dieTemperatureRe = regexp.MustCompile(`(?i)CPU\s+die\s+temperature:\s*([0-9]+\.?[0-9]*)\s*C`)
)

func runCommand(name string, args ...string) (string, bool) {
	cmd := exec.Command(name, args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", false
	}
	return out.String(), true
}

// GetPerCPUFreqBounds reads hw.cpufrequency_min and hw.cpufrequency_max
// through sysctl. They are hardware constants, so they are read once and
// shared by every CPU index.
func GetPerCPUFreqBounds(cpuIndex int) (minMHz *float64, maxMHz *float64) {
	bounds, _ := freqBoundsCache.Get(func() (freqBounds, bool) {
		readSysctlFloat := func(name string) *float64 {
			out, ok := runCommand("sysctl", "-n", name)
			if !ok {
				return nil
			}
			s := strings.TrimSpace(out)
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
		b := freqBounds{
			max: readSysctlFloat("hw.cpufrequency_max"),
			min: readSysctlFloat("hw.cpufrequency_min"),
		}
		return b, b.min != nil || b.max != nil
	})
	return bounds.min, bounds.max
}

func ReadCPUStats() *types.CPUStats {
	// Not readily available in a portable way
	return nil
}

// powermetricsOutput runs powermetrics once for the CPU power and SMC
// samplers. It needs elevated privileges, so a failure is remembered.
func powermetricsOutput() (string, bool) {
	return powermetricsCache.Get(func() (string, bool) {
		out, ok := runCommand("powermetrics", "-n", "1", "-i", "100", "--samplers", "cpu_power,smc")
		if !ok || strings.TrimSpace(out) == "" {
			return "", false
		}
		return out, true
	})
}

// ComputeCPUPower reads the CPU package power from powermetrics in Watts.
func ComputeCPUPower(sample time.Duration) *float64 {
	s, ok := powermetricsOutput()
	if !ok {
		return nil
	}
	m := cpuPowerRegex.FindStringSubmatch(s)
	if len(m) != 3 {
		return nil
	}
	v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64)
	if err != nil {
		return nil
	}
	// Apple silicon reports milliwatts
	if m[2] == "m" {
		v /= 1000.0
	}
	return &v
}

// ReadCPUVcoreVoltage reads the CPU core voltage from the powermetrics SMC
// sampler when it is reported.
func ReadCPUVcoreVoltage() *float64 {
	s, ok := powermetricsOutput()
	if !ok {
		return nil
	}
	// Prefer explicit CPU Vcore
	if m := cpuVcoreRegex.FindStringSubmatch(s); len(m) == 2 {
		if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
			return &v
		}
	}
	// Fallback: first Voltage value in SMC section
	if m := anyVoltageRegex.FindStringSubmatch(s); len(m) == 2 {
		if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
			return &v
		}
	}
	return nil
}

// SampleDPC is Windows-only; there is no DPC accounting here.
func SampleDPC(sample time.Duration) DPCSample { return DPCSample{} }

// ReadCPUTemperature reads the CPU die temperature from the powermetrics
// SMC sampler.
func ReadCPUTemperature() *float64 {
	s, ok := powermetricsOutput()
	if !ok {
		return nil
	}
	// Example: "CPU die temperature: 65.25 C"
	if m := dieTemperatureRe.FindStringSubmatch(s); len(m) == 2 {
		if v, err := strconv.ParseFloat(strings.TrimSpace(m[1]), 64); err == nil {
			return &v
		}
	}
	return nil
}
