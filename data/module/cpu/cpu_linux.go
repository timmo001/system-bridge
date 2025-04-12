//go:build linux
// +build linux

package cpu

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// readRAPLPower reads CPU power from Intel RAPL
func readRAPLPower() (float64, error) {
	// Read from /sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj
	data, err := os.ReadFile("/sys/class/powercap/intel-rapl/intel-rapl:0/energy_uj")
	if err != nil {
		return 0, err
	}

	// Convert microjoules to watts (using a 1-second window)
	energyUj, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
	if err != nil {
		return 0, err
	}

	// Convert to watts (W = μJ / 1,000,000 / time_window)
	return energyUj / 1000000.0, nil
}

// getCPUPower reads CPU power using platform-specific methods
func getCPUPower() (float64, error) {
	// Try reading from RAPL first (Intel processors)
	power, err := readRAPLPower()
	if err == nil {
		return power, nil
	}

	// On Linux, try reading from various sensor files
	// Try reading from hwmon
	files, err := filepath.Glob("/sys/class/hwmon/hwmon*/power1_input")
	if err == nil && len(files) > 0 {
		for _, file := range files {
			if data, err := os.ReadFile(file); err == nil {
				if power, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
					// Convert from microwatts to watts
					return power / 1000000.0, nil
				}
			}
		}
	}

	return 0, fmt.Errorf("unable to determine CPU power consumption")
}

// readRAPLPowerPerCPU reads CPU power from Intel RAPL for a specific CPU
func readRAPLPowerPerCPU(id int) (float64, error) {
	// Read from /sys/class/powercap/intel-rapl/intel-rapl:0/intel-rapl:0:*/energy_uj
	path := fmt.Sprintf("/sys/class/powercap/intel-rapl/intel-rapl:0/intel-rapl:0:%d/energy_uj", id)
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}

	// Convert microjoules to watts (using a 1-second window)
	energyUj, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
	if err != nil {
		return 0, err
	}

	// Convert to watts (W = μJ / 1,000,000 / time_window)
	return energyUj / 1000000.0, nil
}

func getCPUPowerPerCPU(id int) (float64, error) {
	// Try reading from RAPL first (Intel processors)
	power, err := readRAPLPowerPerCPU(id)
	if err == nil {
		return power, nil
	}

	// Try reading from hwmon for specific CPU
	files, err := filepath.Glob(fmt.Sprintf("/sys/class/hwmon/hwmon*/power%d_input", id+1))
	if err == nil && len(files) > 0 {
		for _, file := range files {
			if data, err := os.ReadFile(file); err == nil {
				if power, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
					// Convert from microwatts to watts
					return power / 1000000.0, nil
				}
			}
		}
	}

	return 0, fmt.Errorf("unable to determine CPU %d power consumption", id)
}
