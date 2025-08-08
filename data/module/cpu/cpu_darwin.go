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
	// No straightforward per-core min/max on macOS without private APIs
	return nil, nil
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
