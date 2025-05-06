//go:build darwin
// +build darwin

package gpus

import (
	"encoding/json"
	"os/exec"

	"github.com/charmbracelet/log"
)

func getGPUs() ([]GPU, error) {
	var gpuList []GPU

	// Get GPU information using system_profiler
	cmd := exec.Command("system_profiler", "SPDisplaysDataType", "-json")
	output, err := cmd.Output()
	if err != nil {
		log.Error("failed to get GPU info", "error", err)
		return gpuList, err
	}

	// Parse the JSON output
	var result struct {
		SPDisplaysDataType []struct {
			Name            string `json:"_name"`
			SPPCICores      string `json:"sppci_cores"`
			SPPCIModel      string `json:"sppci_model"`
			SPPCIDeviceType string `json:"sppci_device_type"`
		} `json:"SPDisplaysDataType"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		log.Error("failed to parse GPU info", "error", err)
		return gpuList, err
	}

	// Convert to our GPU type
	for _, dataType := range result.SPDisplaysDataType {
		gpuList = append(gpuList, GPU{
			ID:   dataType.Name,
			Name: dataType.SPPCIModel,
			// TODO: add speed metrics
			// TODO: add load metrics
			// TODO: add memory metrics
			// TODO: add power metrics
			// TODO: add temp metrics
		})
	}

	return gpuList, nil
}
