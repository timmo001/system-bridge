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

func getCPUTemperature() (float64, error) {
	// Try reading from /sys/class/hwmon/hwmon*/name to find CPU temperature sensors
	hwmonPaths, err := filepath.Glob("/sys/class/hwmon/hwmon*/name")
	if err == nil {
		for _, hwmonPath := range hwmonPaths {
			nameData, err := os.ReadFile(hwmonPath)
			if err != nil {
				continue
			}

			sensorName := strings.TrimSpace(string(nameData))
			hwmonDir := filepath.Dir(hwmonPath)

			// Handle different CPU temperature sensors
			switch sensorName {
			case "k10temp": // AMD CPU
				// Read Tctl temperature (primary CPU temperature)
				tempPath := filepath.Join(hwmonDir, "temp1_input")
				tempData, err := os.ReadFile(tempPath)
				if err == nil {
					temp, err := strconv.ParseFloat(strings.TrimSpace(string(tempData)), 64)
					if err == nil {
						// Convert from millidegrees to degrees
						return temp / 1000.0, nil
					}
				}
			case "coretemp": // Intel CPU
				// Try to find CPU package temperature
				tempPaths, err := filepath.Glob(filepath.Join(hwmonDir, "temp*_input"))
				if err == nil {
					for _, tempPath := range tempPaths {
						labelPath := strings.TrimSuffix(tempPath, "input") + "label"
						labelData, err := os.ReadFile(labelPath)
						if err != nil {
							continue
						}

						label := strings.ToLower(strings.TrimSpace(string(labelData)))
						if strings.Contains(label, "package") || strings.Contains(label, "cpu") {
							tempData, err := os.ReadFile(tempPath)
							if err == nil {
								temp, err := strconv.ParseFloat(strings.TrimSpace(string(tempData)), 64)
								if err == nil {
									// Convert from millidegrees to degrees
									return temp / 1000.0, nil
								}
							}
						}
					}
				}
			}
		}
	}

	// Try reading from /sys/class/thermal/thermal_zone* as fallback
	thermalZones, err := filepath.Glob("/sys/class/thermal/thermal_zone*/type")
	if err == nil {
		for _, zonePath := range thermalZones {
			typeData, err := os.ReadFile(zonePath)
			if err != nil {
				continue
			}

			// Check if this is a CPU thermal zone
			if strings.Contains(strings.ToLower(string(typeData)), "cpu") ||
			   strings.Contains(strings.ToLower(string(typeData)), "x86_pkg_temp") {
				tempPath := strings.TrimSuffix(zonePath, "type") + "temp"
				tempData, err := os.ReadFile(tempPath)
				if err != nil {
					continue
				}

				temp, err := strconv.ParseFloat(strings.TrimSpace(string(tempData)), 64)
				if err != nil {
					continue
				}

				// Convert from millidegrees to degrees
				return temp / 1000.0, nil
			}
		}
	}

	return 0, fmt.Errorf("unable to read CPU temperature")
}
