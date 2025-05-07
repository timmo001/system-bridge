package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/sensors"
	"github.com/timmo001/system-bridge/types"
)

type SensorModule struct{}

func (sm SensorModule) Name() types.ModuleName { return types.ModuleSensors }
func (sm SensorModule) Update(ctx context.Context) (any, error) {

	windowsSensors, err := sensors.GetWindowsSensorsData()
	if err != nil {
		log.Error("Could not fetch Windows sensor data", "err", err)
	}
	temperatures, err := sensors.GetTemperatureSensorsData()
	if err != nil {
		log.Error("Could not fetch temperature sensor data", "err", err)
	}

	return types.SensorsData{
		WindowsSensors: windowsSensors,
		Temperatures:   temperatures,
		Fans:           nil,
	}, nil
}
