package data_module

import (
	"context"
	"log/slog"

	"github.com/timmo001/system-bridge/data/module/audio"
	"github.com/timmo001/system-bridge/types"
)

type AudioModule struct{}

func (am AudioModule) Name() types.ModuleName { return types.ModuleAudio }
func (am AudioModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting audio data")

	data, err := audio.GetAudioData(ctx)
	if err != nil {
		slog.Info("Audio devices unavailable", "error", err)
		return types.AudioData{Outputs: []types.AudioDevice{}, Inputs: []types.AudioDevice{}}, nil
	}
	return data, nil
}
