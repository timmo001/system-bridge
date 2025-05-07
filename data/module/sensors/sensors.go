package sensors

import (
	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/sensors"
	"github.com/timmo001/system-bridge/types"
)

func GetTemperatureSensorsData() ([]types.Temperature, error) {
	temperatures := make([]types.Temperature, 0)
	temperatureStats, err := sensors.SensorsTemperatures()
	if err != nil {
		log.Error("failed to get  temperature stats", "error", err)
		return temperatures, err
	} else {
		for _, ts := range temperatureStats {
			temperatures = append(temperatures, types.Temperature{SensorKey: ts.SensorKey, Temperature: ts.Temperature, High: ts.High, Critical: ts.Critical})
		}
	}
	return temperatures, nil
}
