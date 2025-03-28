//go:build darwin
// +build darwin

package gpus

import (
	"encoding/json"
	"os/exec"
	"strconv"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

func getGPUs() ([]types.GPU, error) {
	var gpuList []types.GPU

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
			SPDisplays []struct {
				SPDisplaysDeviceID string `json:"spdisplays_device-id"`
				SPDisplaysModel    string `json:"spdisplays_model"`
				SPDisplaysVRAM     string `json:"spdisplays_vram"`
			} `json:"SPDisplays"`
		} `json:"SPDisplaysDataType"`
	}

	if err := json.Unmarshal(output, &result); err != nil {
		log.Error("failed to parse GPU info", "error", err)
		return gpuList, err
	}

	// Convert to our GPU type
	for _, displayType := range result.SPDisplaysDataType {
		for _, display := range displayType.SPDisplays {
			// Parse VRAM size
			var memoryTotal float64
			if strings.Contains(display.SPDisplaysVRAM, "GB") {
				memoryStr := strings.TrimSpace(strings.Replace(display.SPDisplaysVRAM, "GB", "", 1))
				memoryTotal, _ = strconv.ParseFloat(memoryStr, 64)
			}

			gpuList = append(gpuList, types.GPU{
				ID:          display.SPDisplaysDeviceID,
				Name:        display.SPDisplaysModel,
				MemoryTotal: &memoryTotal,
			})
		}
	}

	// Get GPU temperature using powermetrics
	cmd = exec.Command("sudo", "powermetrics", "--samplers", "gpu_power", "-n", "1", "--json")
	output, err = cmd.Output()
	if err == nil {
		var result struct {
			GPU []struct {
				Temperature float64 `json:"temperature"`
			} `json:"gpu"`
		}

		if err := json.Unmarshal(output, &result); err == nil && len(result.GPU) > 0 {
			// Assign temperature to the first GPU
			if len(gpuList) > 0 {
				gpuList[0].Temperature = &result.GPU[0].Temperature
			}
		}
	}

	return gpuList, nil
}
