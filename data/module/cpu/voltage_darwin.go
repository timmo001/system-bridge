//go:build darwin
// +build darwin

package cpu

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
)

// GetCPUVoltage returns the CPU voltage in volts
func GetCPUVoltage() (float64, error) {
	// Use powermetrics to get CPU voltage
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "1000", "--samplers", "cpu_power")
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get CPU voltage: %v", err)
	}

	// Parse the output looking for CPU voltage
	re := regexp.MustCompile(`CPU voltage: (\d+\.\d+) V`)
	matches := re.FindStringSubmatch(string(output))
	if len(matches) >= 2 {
		voltage, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse CPU voltage: %v", err)
		}
		return voltage, nil
	}

	// Alternative pattern for some Mac models
	re = regexp.MustCompile(`CPU die voltage: (\d+\.\d+) V`)
	matches = re.FindStringSubmatch(string(output))
	if len(matches) >= 2 {
		voltage, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse CPU voltage: %v", err)
		}
		return voltage, nil
	}

	return 0, fmt.Errorf("could not find CPU voltage in powermetrics output")
}

// GetCPUVoltagePerCPU returns the voltage for a specific CPU core in volts
func GetCPUVoltagePerCPU(id int) (float64, error) {
	// Use powermetrics to get per-CPU voltage
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "1000", "--samplers", "cpu_power")
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get CPU %d voltage: %v", id, err)
	}

	// Parse the output looking for specific CPU core voltage
	pattern := fmt.Sprintf(`CPU %d voltage: (\d+\.\d+) V`, id)
	re := regexp.MustCompile(pattern)
	matches := re.FindStringSubmatch(string(output))
	if len(matches) >= 2 {
		voltage, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse CPU %d voltage: %v", id, err)
		}
		return voltage, nil
	}

	// Alternative pattern for some Mac models
	pattern = fmt.Sprintf(`CPU %d die voltage: (\d+\.\d+) V`, id)
	re = regexp.MustCompile(pattern)
	matches = re.FindStringSubmatch(string(output))
	if len(matches) >= 2 {
		voltage, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse CPU %d voltage: %v", id, err)
		}
		return voltage, nil
	}

	return 0, fmt.Errorf("could not find CPU %d voltage in powermetrics output", id)
}
