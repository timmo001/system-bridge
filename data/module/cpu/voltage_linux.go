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

// readAMDSMUVoltage attempts to read voltage from AMD's SMU interface
func readAMDSMUVoltage(core int) (float64, error) {
	// Try reading from ryzen_smu module if available
	smuPath := "/sys/kernel/ryzen_smu_drv"
	if _, err := os.Stat(smuPath); err == nil {
		// Read core voltage from SMU
		voltagePath := filepath.Join(smuPath, fmt.Sprintf("core%d_voltage", core))
		if data, err := os.ReadFile(voltagePath); err == nil {
			if voltage, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
				// Convert from millivolts to volts if needed
				if voltage > 100 {
					return voltage / 1000.0, nil
				}
				return voltage, nil
			}
		}
	}

	return 0, fmt.Errorf("unable to read from AMD SMU")
}

// readZenpowerVoltage attempts to read voltage from zenpower module
func readZenpowerVoltage(core int) (float64, error) {
	// Find zenpower hwmon device
	hwmonPaths, err := filepath.Glob("/sys/class/hwmon/hwmon*/name")
	if err == nil {
		for _, namePath := range hwmonPaths {
			nameData, err := os.ReadFile(namePath)
			if err != nil {
				continue
			}
			if strings.TrimSpace(string(nameData)) == "zenpower" {
				hwmonPath := filepath.Dir(namePath)
				// Try reading SVI2 voltage for the core
				voltagePath := filepath.Join(hwmonPath, fmt.Sprintf("in%d_input", core+1))
				if data, err := os.ReadFile(voltagePath); err == nil {
					if voltage, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
						// Convert from millivolts to volts
						return voltage / 1000.0, nil
					}
				}
			}
		}
	}

	return 0, fmt.Errorf("unable to read from zenpower")
}

// readMSRVoltage attempts to read voltage from MSR registers
func readMSRVoltage(core int) (float64, error) {
	// Check if we have access to MSR
	msrPath := fmt.Sprintf("/dev/cpu/%d/msr", core)
	if _, err := os.Stat(msrPath); err != nil {
		return 0, fmt.Errorf("MSR not accessible: %v", err)
	}

	// Open MSR file
	msrFile, err := os.OpenFile(msrPath, os.O_RDONLY, 0)
	if err != nil {
		return 0, fmt.Errorf("failed to open MSR: %v", err)
	}
	defer msrFile.Close()

	// Read MSR_PERF_STATUS (0x198) for Intel or AMD equivalent
	buf := make([]byte, 8)
	if _, err := msrFile.ReadAt(buf, 0x198); err != nil {
		return 0, fmt.Errorf("failed to read MSR: %v", err)
	}

	// Extract voltage from MSR value
	// This is CPU family/model specific and needs proper implementation
	// For now, return error to indicate this needs to be implemented
	return 0, fmt.Errorf("MSR voltage reading not implemented for this CPU")
}

// GetCPUVoltage returns the CPU voltage in volts
func GetCPUVoltage() (float64, error) {
	// First try AMD SMU interface
	if voltage, err := readAMDSMUVoltage(0); err == nil {
		return voltage, nil
	}

	// Then try zenpower
	if voltage, err := readZenpowerVoltage(0); err == nil {
		return voltage, nil
	}

	// Try reading from hwmon first
	hwmonPaths, err := filepath.Glob("/sys/class/hwmon/hwmon*/")
	if err == nil {
		for _, hwmonPath := range hwmonPaths {
			// Read the name of the hwmon device
			nameFile := filepath.Join(hwmonPath, "name")
			nameData, err := os.ReadFile(nameFile)
			if err != nil {
				continue
			}
			name := strings.TrimSpace(string(nameData))

			// Check for known voltage monitoring chips
			switch name {
			case "coretemp", "k10temp": // Intel and AMD CPU sensors
				voltagePaths := []string{
					filepath.Join(hwmonPath, "in0_input"), // Core voltage
					filepath.Join(hwmonPath, "cpu0_vid"),  // VID voltage
				}
				for _, path := range voltagePaths {
					if data, err := os.ReadFile(path); err == nil {
						if voltage, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							// Convert from millivolts to volts
							return voltage / 1000.0, nil
						}
					}
				}
			}
		}
	}

	// Try MSR as last resort
	if voltage, err := readMSRVoltage(0); err == nil {
		return voltage, nil
	}

	return 0, fmt.Errorf("unable to determine CPU voltage")
}

// GetCPUVoltagePerCPU returns the voltage for a specific CPU core in volts
func GetCPUVoltagePerCPU(id int) (float64, error) {
	// First try AMD SMU interface
	if voltage, err := readAMDSMUVoltage(id); err == nil {
		return voltage, nil
	}

	// Then try zenpower
	if voltage, err := readZenpowerVoltage(id); err == nil {
		return voltage, nil
	}

	// Try reading from hwmon first
	hwmonPaths, err := filepath.Glob("/sys/class/hwmon/hwmon*/")
	if err == nil {
		for _, hwmonPath := range hwmonPaths {
			// Read the name of the hwmon device
			nameFile := filepath.Join(hwmonPath, "name")
			nameData, err := os.ReadFile(nameFile)
			if err != nil {
				continue
			}
			name := strings.TrimSpace(string(nameData))

			// Check for known voltage monitoring chips
			switch name {
			case "coretemp", "k10temp": // Intel and AMD CPU sensors
				voltagePaths := []string{
					filepath.Join(hwmonPath, fmt.Sprintf("in%d_input", id)), // Per-core voltage
					filepath.Join(hwmonPath, fmt.Sprintf("cpu%d_vid", id)),  // Per-core VID voltage
				}
				for _, path := range voltagePaths {
					if data, err := os.ReadFile(path); err == nil {
						if voltage, err := strconv.ParseFloat(strings.TrimSpace(string(data)), 64); err == nil {
							// Convert from millivolts to volts
							return voltage / 1000.0, nil
						}
					}
				}
			}
		}
	}

	// Try MSR as last resort
	if voltage, err := readMSRVoltage(id); err == nil {
		return voltage, nil
	}

	return 0, fmt.Errorf("unable to determine CPU %d voltage", id)
}
