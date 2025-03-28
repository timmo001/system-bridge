package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data/module/sensors"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateSensorsModule() (types.SensorsData, error) {
	log.Info("Getting sensors data")

	return sensors.GetSensorsData()
}
