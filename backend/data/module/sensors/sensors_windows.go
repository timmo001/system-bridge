//go:build windows
// +build windows

package sensors

import (
	"encoding/json"
	"os/exec"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

// getWindowsSensorsData fetches sensor data available only on Windows platforms
func getWindowsSensorsData() (*types.SensorsWindows, error) {
	log.Info("Getting Windows sensors data using LibreHardwareMonitor and NvAPIWrapper")

	var windowsSensors types.SensorsWindows
	windowsSensors.Hardware = make([]types.SensorsWindowsHardware, 0)
	windowsSensors.NVIDIA = &types.SensorsNVIDIA{
		Displays: make([]types.SensorsNVIDIADisplay, 0),
		GPUs:     make([]types.SensorsNVIDIAGPU, 0),
	}

	// Run lib/sensors/windows/bin/SystemBridgeWindowsSensors.exe
	cmd := exec.Command("lib/sensors/windows/bin/SystemBridgeWindowsSensors.exe")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	log.Debug("Windows sensors data", "data", string(output))

	// Parse the output
	json.Unmarshal(output, &windowsSensors)

	return &windowsSensors, nil
}
