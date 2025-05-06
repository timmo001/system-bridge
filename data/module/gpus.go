package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/gpus"
	"github.com/timmo001/system-bridge/types"
)

// GPUsData represents information about all GPU devices
type GPUData struct {
}

func (gpuData GPUData) Name() types.ModuleName { return types.ModuleGPU }
func (gpuData GPUData) Update(ctx context.Context) (any, error) {
	log.Info("Getting GPUs data")

	empty := make([]gpus.GPU, 0)

	gpus, err := gpus.GetGPUs()
	if err != nil {
		log.Error("failed to get GPU info", "error", err)
		return empty, err
	}

	return gpus, nil
}
