//go:build windows
// +build windows

package sensors

import (
	"encoding/json"
	"os"
	"os/exec"

	"github.com/charmbracelet/log"
)

// GetWindowsSensorsData fetches sensor data available only on Windows platforms
func GetWindowsSensorsData() (*SensorsWindows, error) {
	var windowsSensors SensorsWindows
	windowsSensors.Hardware = make([]SensorsWindowsHardware, 0)
	windowsSensors.NVIDIA = &SensorsNVIDIA{
		Displays: make([]SensorsNVIDIADisplay, 0),
		GPUs:     make([]SensorsNVIDIAGPU, 0),
	}

	// Run lib/sensors/windows/bin/SystemBridgeWindowsSensors.exe if it exists
	if _, err := os.Stat("lib/sensors/windows/bin/SystemBridgeWindowsSensors.exe"); err == nil {
		cmd := exec.Command("lib/sensors/windows/bin/SystemBridgeWindowsSensors.exe")
		output, err := cmd.Output()
		if err != nil {
			return nil, err
		}

		log.Debug("Windows sensors data", "data", string(output))

		// Parse the output
		json.Unmarshal(output, &windowsSensors)
	}

	return &windowsSensors, nil
}
