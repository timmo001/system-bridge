package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/gpus"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateGPUsModule() (types.GPUsData, error) {
	log.Info("Getting GPUs data")

	var gpusData types.GPUsData = make([]types.GPU, 0)

	gpus, err := gpus.GetGPUs()
	if err != nil {
		log.Error("failed to get GPU info", "error", err)
		return gpusData, err
	}

	gpusData = gpus
	return gpusData, nil
}
