package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/backend/data/module/gpus"
	"github.com/timmo001/system-bridge/types"
)

// GPUsData represents information about all GPU devices
type GPUsData struct {
	GPUs []types.GPU `json:"gpus"`
}

func (t *Module) UpdateGPUsModule() (GPUsData, error) {
	log.Info("Getting GPUs data")

	var gpusData GPUsData
	// Initialize arrays
	gpusData.GPUs = make([]types.GPU, 0)

	gpus, err := gpus.GetGPUs()
	if err != nil {
		log.Error("failed to get GPU info", "error", err)
		return gpusData, err
	}

	gpusData.GPUs = gpus
	return gpusData, nil
}
