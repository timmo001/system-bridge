//go:build windows
// +build windows

package cpu

import (
	"strings"

	"github.com/shirou/gopsutil/v3/host"
)

// GetCPUTemperature returns the CPU temperature in degrees Celsius
func GetCPUTemperature() (float64, error) {
	temps, err := host.SensorsTemperatures()
	if err != nil {
		return 0, err
	}

	for _, temp := range temps {
		if strings.Contains(strings.ToLower(temp.SensorKey), "cpu") {
			return temp.Temperature, nil
		}
	}

	return 0, nil
}
