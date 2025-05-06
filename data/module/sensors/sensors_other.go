//go:build !windows
// +build !windows

package sensors

func GetWindowsSensorsData() (*SensorsWindows, error) {
	var sensorsData SensorsWindows
	sensorsData.Hardware = make([]SensorsWindowsHardware, 0)
	sensorsData.NVIDIA = &SensorsNVIDIA{
		Displays: make([]SensorsNVIDIADisplay, 0),
		GPUs:     make([]SensorsNVIDIAGPU, 0),
	}

	return &sensorsData, nil
}
