//go:build darwin
// +build darwin

package cpu

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
)

func getCPUTemperature() (float64, error) {
	// Use powermetrics to get CPU temperature
	cmd := exec.Command("powermetrics", "-n", "1", "-i", "1000", "--samplers", "cpu_temp")
	output, err := cmd.Output()
	if err != nil {
		return 0, fmt.Errorf("failed to get CPU temperature: %v", err)
	}

	// Parse the output looking for CPU die temperature
	re := regexp.MustCompile(`CPU die temperature: (\d+\.\d+) C`)
	matches := re.FindStringSubmatch(string(output))
	if len(matches) >= 2 {
		temp, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse CPU temperature: %v", err)
		}
		return temp, nil
	}

	// Alternative pattern for some Mac models
	re = regexp.MustCompile(`CPU temperature: (\d+\.\d+) C`)
	matches = re.FindStringSubmatch(string(output))
	if len(matches) >= 2 {
		temp, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, fmt.Errorf("failed to parse CPU temperature: %v", err)
		}
		return temp, nil
	}

	return 0, fmt.Errorf("could not find CPU temperature in powermetrics output")
}
