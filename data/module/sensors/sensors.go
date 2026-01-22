package sensors

import (
	"log/slog"

	"github.com/shirou/gopsutil/v4/sensors"
	"github.com/timmo001/system-bridge/types"
)

func GetTemperatureSensorsData() ([]types.Temperature, error) {
	temperatures := make([]types.Temperature, 0)
	temperatureStats, err := sensors.SensorsTemperatures()
	if err != nil {
		slog.Warn("Failed to get temperature stats", "error", err)
		return temperatures, err
	} else {
		for _, ts := range temperatureStats {
			temperatures = append(temperatures, types.Temperature{SensorKey: ts.SensorKey, Temperature: ts.Temperature, High: ts.High, Critical: ts.Critical})
		}
	}
	return temperatures, nil
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
