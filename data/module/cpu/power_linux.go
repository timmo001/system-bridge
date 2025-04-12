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
	// First try to find the CPU-specific RAPL domain
	// The structure is typically:
	// intel-rapl:X/ - Package (socket) domain
	// intel-rapl:X/intel-rapl:X:Y/ - Core/CPU domain where Y is the CPU ID

	// List all RAPL domains
	domains, err := filepath.Glob("/sys/class/powercap/intel-rapl/intel-rapl:*/")
	if err != nil {
		return 0, err
	}

	for _, domain := range domains {
		// Check CPU domains within each package
		cpuPath := fmt.Sprintf("%sintel-rapl:*:%d", domain, id)
		cpuDomains, err := filepath.Glob(cpuPath)
		if err == nil && len(cpuDomains) > 0 {
			// Found the CPU domain, read its energy value
			data, err := os.ReadFile(filepath.Join(cpuDomains[0], "energy_uj"))
			if err != nil {
				continue
			}

			energyUj, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64)
			if err != nil {
				continue
			}

			// Convert to watts (W = μJ / 1,000,000 / time_window)
			return energyUj / 1000000.0, nil
		}
	}

	// If RAPL per-CPU reading fails, try alternative hwmon path
	// Note: Some systems use a different naming convention for per-CPU power
	patterns := []string{
		fmt.Sprintf("/sys/class/hwmon/hwmon*/power%d_input", id+1),
		fmt.Sprintf("/sys/class/hwmon/hwmon*/device/power%d_input", id),
		fmt.Sprintf("/sys/class/hwmon/hwmon*/temp%d_input", id+1), // Some systems expose CPU power as temperature
	}

	for _, pattern := range patterns {
		files, err := filepath.Glob(pattern)
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
	}

	return 0, fmt.Errorf("unable to determine CPU %d power consumption", id)
}

func getCPUPowerPerCPU(id int) (float64, error) {
	return readRAPLPowerPerCPU(id)
}
