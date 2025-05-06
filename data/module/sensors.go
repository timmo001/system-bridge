package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/sensors"
	"github.com/timmo001/system-bridge/types"
)

// SensorsData represents all sensor information
type SensorsData struct {
	// TODO: Add fans model
	Fans           any                     `json:"fans"`
	Temperatures   []sensors.Temperature   `json:"temperatures"`
	WindowsSensors *sensors.SensorsWindows `json:"windows_sensors"`
}

func (sensorsData SensorsData) Name() types.ModuleName { return types.ModuleSensors }
func (sensorsData SensorsData) Update(ctx context.Context) (any, error) {

	windowsSensors, err := sensors.GetWindowsSensorsData()
	if err != nil {
		log.Error("Could not fetch Windows sensor data", "err", err)
	}
	temperatures, err := sensors.GetTemperatureSensorsData()
	if err != nil {
		log.Error("Could not fetch temperature sensor data", "err", err)
	}

	return SensorsData{
		WindowsSensors: windowsSensors,
		Temperatures:   temperatures,
		Fans:           nil,
	}, nil
}
