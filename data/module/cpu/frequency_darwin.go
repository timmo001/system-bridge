//go:build darwin
// +build darwin

package cpu

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
)

// getCPUFrequencies returns the min, max, and current frequencies for a specific CPU
func getCPUFrequencies(cpuID int) (min, max, current float64, err error) {
	// Use sysctl to get CPU frequencies
	cmd := exec.Command("sysctl", "-n", "machdep.cpu.brand_string")
	output, err := cmd.Output()
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to get CPU info: %v", err)
	}

	// Extract max frequency from CPU brand string (e.g., "Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz")
	re := regexp.MustCompile(`@ (\d+\.\d+)GHz`)
	matches := re.FindStringSubmatch(string(output))
	if len(matches) < 2 {
		return 0, 0, 0, fmt.Errorf("could not parse CPU frequency from brand string")
	}

	maxGHz, err := strconv.ParseFloat(matches[1], 64)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to parse max frequency: %v", err)
	}
	max = maxGHz * 1000 // Convert GHz to MHz

	// Get current frequency using powermetrics
	cmd = exec.Command("powermetrics", "-n", "1", "-i", "1000", "--samplers", "cpu_power")
	output, err = cmd.Output()
	if err == nil {
		re = regexp.MustCompile(`CPU (\d+) frequency: (\d+)`)
		matches = re.FindStringSubmatch(string(output))
		if len(matches) >= 3 && matches[1] == fmt.Sprint(cpuID) {
			if cur, err := strconv.ParseFloat(matches[2], 64); err == nil {
				current = cur
			}
		}
	}
	if current == 0 {
		current = max // Fallback if powermetrics fails
	}

	// macOS doesn't provide min frequency directly, estimate as 1/4 of max
	min = max / 4.0

	return min, max, current, nil
}

// GetCPUFrequency returns the min, max, and current frequencies for CPU 0
func GetCPUFrequency() (min, max, current float64, err error) {
	return getCPUFrequencies(0)
}

// GetCPUFrequencyPerCPU returns the min, max, and current frequencies for a specific CPU
func GetCPUFrequencyPerCPU(id int) (min, max, current float64, err error) {
	return getCPUFrequencies(id)
}
