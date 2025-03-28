package sensors

import "github.com/timmo001/system-bridge/types"

func GetSensorsData() (types.SensorsData, error) {
	var sensorsData types.SensorsData
	// Initialize arrays
	sensorsData.WindowsSensors = &types.SensorsWindows{
		Hardware: make([]types.SensorsWindowsHardware, 0),
		NVIDIA: &types.SensorsNVIDIA{
			Displays: make([]types.SensorsNVIDIADisplay, 0),
			GPUs:     make([]types.SensorsNVIDIAGPU, 0),
		},
	}

	// TODO: Implement
	return sensorsData, nil
}
