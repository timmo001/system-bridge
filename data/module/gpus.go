package data_module

import (
	"context"

	"log/slog"

	"github.com/timmo001/system-bridge/data/module/gpus"
	"github.com/timmo001/system-bridge/types"
)

type GPUModule struct{}

func (gm GPUModule) Name() types.ModuleName { return types.ModuleGPUs }
func (gm GPUModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting GPUs data")

	gpusData := make([]types.GPU, 0)

	gpus, err := gpus.GetGPUs()
	if err != nil {
		slog.Error("failed to get GPU info", "error", err)
		return gpusData, err
	}

	gpusData = gpus
	return gpusData, nil
}
