package sensors

import (
	"errors"
	"fmt"
	"log/slog"

	"github.com/shirou/gopsutil/v4/sensors"
	"github.com/timmo001/system-bridge/types"
)

// GetTemperatureSensorsData returns every temperature reading it can get.
// gopsutil returns the readings it got along with a Warnings error when some
// sensors fail to read, so those readings are kept.
func GetTemperatureSensorsData() ([]types.Temperature, error) {
	temperatures := make([]types.Temperature, 0)
	temperatureStats, err := sensors.SensorsTemperatures()
	if err != nil {
		var warnings *sensors.Warnings
		if !errors.As(err, &warnings) {
			slog.Warn("Failed to get temperature stats", "error", err)
			return temperatures, err
		}
		slog.Debug("Some temperature sensors could not be read", "errors", warnings.List)
	}
	// Chips sharing a driver, such as several NVMe drives or DIMMs, give the
	// same key, so later ones get a number to keep keys unique
	seen := make(map[string]int, len(temperatureStats))
	for _, ts := range temperatureStats {
		key := ts.SensorKey
		seen[ts.SensorKey]++
		if n := seen[ts.SensorKey]; n > 1 {
			key = fmt.Sprintf("%s_%d", ts.SensorKey, n)
		}
		temperatures = append(temperatures, types.Temperature{SensorKey: key, Temperature: ts.Temperature, High: temperatureLimit(ts.High), Critical: temperatureLimit(ts.Critical)})
	}
	return temperatures, nil
}

// temperatureLimit drops limits no sensor could reach, such as the
// 65261.85 °C NVMe drives give when a threshold isn't set, so they read as
// unset (0).
func temperatureLimit(celsius float64) float64 {
	if celsius > 1000 {
		return 0
	}
	return celsius
}

// Return empty data for compatibility as we have removed the windows sensors module
func GetWindowsSensorsData() (*types.SensorsWindows, error) {
	var sensorsData types.SensorsWindows
	sensorsData.Hardware = make([]types.SensorsWindowsHardware, 0)
	sensorsData.NVIDIA = &types.SensorsNVIDIA{
		Displays: make([]types.SensorsNVIDIADisplay, 0),
		GPUs:     make([]types.SensorsNVIDIAGPU, 0),
	}

	return &sensorsData, nil
}
