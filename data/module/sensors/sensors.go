package sensors

import (
	"github.com/timmo001/system-bridge/types"
)

func GetSensorsData() (types.SensorsData, error) {
	data, err := getWindowsSensorsData()
	if err != nil {
		return types.SensorsData{}, err
	}
	return types.SensorsData{
		WindowsSensors: data,
		Fans: nil,
		Temperatures: nil,
	}, nil
}
