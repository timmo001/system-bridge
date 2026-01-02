//go:build windows

package gpus

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

func getGPUs() ([]types.GPU, error) {
	var gpus []types.GPU

	// Try to get NVIDIA GPU info first using nvidia-smi
	cmd := exec.Command("nvidia-smi", "--query-gpu=gpu_name,memory.total,memory.used,memory.free,utilization.gpu,clocks.current.graphics,clocks.current.memory,power.draw,temperature.gpu", "--format=csv,noheader,nounits")
	utils.SetHideWindow(cmd)
	output, err := cmd. Output()
	if err == nil {
		// Parse nvidia-smi output
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			fields := strings.Split(line, ",")
			if len(fields) >= 9 {
				name := strings.TrimSpace(fields[0])
				memoryTotal, _ := strconv.ParseFloat(strings.TrimSpace(fields[1]), 64)
				memoryUsed, _ := strconv.ParseFloat(strings.TrimSpace(fields[2]), 64)
				memoryFree, _ := strconv.ParseFloat(strings.TrimSpace(fields[3]), 64)
				coreLoad, _ := strconv.ParseFloat(strings.TrimSpace(fields[4]), 64)
				coreClock, _ := strconv.ParseFloat(strings.TrimSpace(fields[5]), 64)
				memoryClock, _ := strconv.ParseFloat(strings.TrimSpace(fields[6]), 64)
				powerUsage, _ := strconv.ParseFloat(strings.TrimSpace(fields[7]), 64)
				temperature, _ := strconv.ParseFloat(strings.TrimSpace(fields[8]), 64)

				gpus = append(gpus, types.GPU{
					ID:          fmt.Sprintf("nvidia-%d", len(gpus)),
					Name:        name,
					CoreClock:   &coreClock,
					CoreLoad:    &coreLoad,
					MemoryClock:   &memoryClock,
					MemoryLoad:  &coreLoad,
					MemoryFree:  &memoryFree,
					MemoryUsed:  &memoryUsed,
					MemoryTotal: &memoryTotal,
					PowerUsage:   &powerUsage,
					Temperature: &temperature,
				})
			}
		}

		// If we got NVIDIA GPUs, return them
		if len(gpus) > 0 {
			return gpus, nil
		}
	} else {
		slog.Debug("nvidia-smi not available or failed", "error", err)
	}

	// Fallback:  Get basic GPU information using PowerShell WMI
	cmd = exec. Command("powershell", "-Command", `
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
	output, err = cmd.Output()
	if err != nil {
		slog.Error("failed to get GPU info", "error", err)
		return gpus, err
	}

	// Parse the JSON output
	var gpuInfo []struct {
		ID          string  `json:"ID"`
		Name        string  `json:"Name"`
		MemoryTotal float64 `json:"MemoryTotal"`
	}
	if err := json.Unmarshal(output, &gpuInfo); err != nil {
		slog.Error("failed to parse GPU info", "error", err)
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

	// Get GPU temperature using OpenHardwareMonitor (fallback for non-NVIDIA or when nvidia-smi unavailable)
	cmd = exec.Command("powershell", "-Command", `
		Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | ForEach-Object {
			$temp = ($_.CurrentTemperature - 2732) / 10. 0
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
			// Assign temperature to the first GPU if it doesn't already have one
			if len(gpus) > 0 && gpus[0].Temperature == nil {
				gpus[0].Temperature = &temps[0].Temperature
			}
		}
	}

	return gpus, nil
}
