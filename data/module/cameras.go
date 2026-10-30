package data_module

import (
	"context"
	"log/slog"

	"github.com/timmo001/system-bridge/data/module/cameras"
	"github.com/timmo001/system-bridge/types"
)

type CameraModule struct{}

func (cm CameraModule) Name() types.ModuleName { return types.ModuleCameras }
func (cm CameraModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting cameras data")

	data, err := cameras.GetCamerasData(ctx)
	if err != nil {
		slog.Info("Cameras unavailable", "error", err)
		return types.CamerasData{Cameras: []types.Camera{}}, nil
	}
	return data, nil
}
