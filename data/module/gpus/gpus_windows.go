//go:build windows
// +build windows

package gpus

import (
	"encoding/json"
	"os/exec"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

func getGPUs() ([]types.GPU, error) {
	var gpus []types.GPU

	// Get GPU information using PowerShell
	cmd := exec.Command("powershell", "-Command", `
		class GPU {
			[string]$ID
			[string]$Name
			[int]$MemoryTotal
			}

		$gpus = [System.Collections.Generic.List[GPU]]::new()
		Get-WmiObject Win32_VideoController | ForEach-Object {
			$gpu = New-Object GPU -Property @{
				ID = $_.DeviceID
				Name = $_.Name
				MemoryTotal = [math]::Round($_.AdapterRAM / 1GB, 2)
			}
			$gpus.Add($gpu)
		} 
		ConvertTo-Json -Compress $gpus
	`)
	utils.SetHideWindow(cmd)
	output, err := cmd.Output()
	if err != nil {
		log.Error("failed to get GPU info", "error", err)
		return gpus, err
	}

	// Parse the JSON output
	var gpuInfo []struct {
		ID          string  `json:"ID"`
		Name        string  `json:"Name"`
		MemoryTotal float64 `json:"MemoryTotal"`
	}
	if err := json.Unmarshal(output, &gpuInfo); err != nil {
		log.Error("failed to parse GPU info", "error", err)
		return gpus, err
	}

	// Convert to our GPU type
	for _, info := range gpuInfo {
		gpus = append(gpus, types.GPU{
			ID:          info.ID,
			Name:        info.Name,
			MemoryTotal: &info.MemoryTotal,
		})
	}

	// Get GPU temperature using OpenHardwareMonitor
	cmd = exec.Command("powershell", "-Command", `
		Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | ForEach-Object {
			$temp = ($_.CurrentTemperature - 2732) / 10.0
			[PSCustomObject]@{
				Temperature = $temp
			}
		} | ConvertTo-Json
	`)
	utils.SetHideWindow(cmd)
	output, err = cmd.Output()
	if err == nil {
		var temps []struct {
			Temperature float64 `json:"Temperature"`
		}
		if err := json.Unmarshal(output, &temps); err == nil && len(temps) > 0 {
			// Assign temperature to the first GPU
			if len(gpus) > 0 {
				gpus[0].Temperature = &temps[0].Temperature
			}
		}
	}

	return gpus, nil
}
