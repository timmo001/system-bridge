//go:build darwin
// +build darwin

package cpu

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
)

// getCPUPower reads CPU power using platform-specific methods
func getCPUPower() (float64, error) {
	// On macOS, try using powermetrics
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "1000", "--samplers", "cpu_power")
	output, err := cmd.Output()
	if err == nil {
		// Parse powermetrics output
		if matches := regexp.MustCompile(`CPU Power: (\d+\.\d+) W`).FindStringSubmatch(string(output)); len(matches) > 1 {
			return strconv.ParseFloat(matches[1], 64)
		}
	}

	return 0, fmt.Errorf("unable to determine CPU power consumption")
}

func getCPUPowerPerCPU(id int) (float64, error) {
	// On macOS, try using powermetrics with CPU-specific sampling
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "1000", "--samplers", "cpu_power")
	output, err := cmd.Output()
	if err == nil {
		// Parse powermetrics output for specific CPU
		pattern := fmt.Sprintf(`CPU %d Power: (\d+\.\d+) W`, id)
		if matches := regexp.MustCompile(pattern).FindStringSubmatch(string(output)); len(matches) > 1 {
			return strconv.ParseFloat(matches[1], 64)
		}
	}

	return 0, fmt.Errorf("unable to determine CPU %d power consumption", id)
}
