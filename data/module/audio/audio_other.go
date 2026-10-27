//go:build !linux && !windows

package audio

import (
	"context"

	"github.com/timmo001/system-bridge/types"
)

// GetAudioData isn't supported on this platform yet
func GetAudioData(context.Context) (types.AudioData, error) {
	return types.AudioData{Outputs: []types.AudioDevice{}, Inputs: []types.AudioDevice{}, Apps: []types.AudioApp{}}, nil
}
