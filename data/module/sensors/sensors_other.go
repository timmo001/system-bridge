//go:build !windows
// +build !windows

package sensors

import (
	"github.com/timmo001/system-bridge/types"
)

func GetWindowsSensorsData() (*types.SensorsWindows, error) {
	var sensorsData types.SensorsWindows
	sensorsData.Hardware = make([]types.SensorsWindowsHardware, 0)
	sensorsData.NVIDIA = &types.SensorsNVIDIA{
		Displays: make([]types.SensorsNVIDIADisplay, 0),
		GPUs:     make([]types.SensorsNVIDIAGPU, 0),
	}

	return &sensorsData, nil
}
