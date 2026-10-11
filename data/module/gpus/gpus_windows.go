//go:build windows

package gpus

import (
	"encoding/json"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

func getGPUs() ([]types.GPU, error) {
	var gpus []types.GPU

	// Try to get NVIDIA GPU info first using nvidia-smi
	cmd := exec.Command("nvidia-smi", "--query-gpu=gpu_name,memory.total,memory.used,memory.free,utilization.gpu,clocks.current.graphics,clocks.current.memory,power.draw,temperature.gpu", "--format=csv,noheader,nounits")
	utils.SetHideWindow(cmd)
	output, err := cmd.Output()
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
					MemoryClock: &memoryClock,
					MemoryLoad:  &coreLoad,
					MemoryFree:  &memoryFree,
					MemoryUsed:  &memoryUsed,
					MemoryTotal: &memoryTotal,
					PowerUsage:  &powerUsage,
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

	// Fallback: basic adapter identity from WMI. It only changes with the
	// hardware, so it is cached rather than running PowerShell every update.
	controllers, ok := videoControllerCache.Get(readVideoControllers)
	if !ok {
		return gpus, errors.New("failed to get GPU info")
	}

	// Convert to our GPU type
	for _, info := range controllers {
		memoryTotal := info.MemoryTotal
		gpus = append(gpus, types.GPU{
			ID:          info.ID,
			Name:        info.Name,
			MemoryTotal: &memoryTotal,
		})
	}

	// Best-effort temperature from the ACPI thermal zone (fallback for
	// non-NVIDIA or when nvidia-smi unavailable). Few machines expose it, so a
	// failure is remembered instead of retrying every update.
	if temp, ok := thermalZoneCache.Get(readThermalZoneTemperature); ok && len(gpus) > 0 && gpus[0].Temperature == nil {
		gpus[0].Temperature = &temp
	}

	return gpus, nil
}

const (
	// staticTTL is for values that only change with the hardware.
	staticTTL = 10 * time.Minute
	// unavailableTTL is how long to wait before retrying a source that failed.
	unavailableTTL = 10 * time.Minute
)

type videoController struct {
	ID          string  `json:"ID"`
	Name        string  `json:"Name"`
	MemoryTotal float64 `json:"MemoryTotal"`
}

var (
	videoControllerCache = utils.TTLValue[[]videoController]{TTL: staticTTL, FailTTL: unavailableTTL}
	thermalZoneCache     = utils.TTLValue[float64]{FailTTL: unavailableTTL}
)

func readVideoControllers() ([]videoController, bool) {
	cmd := exec.Command("powershell", "-NoProfile", "-Command", `
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
		slog.Error("failed to get GPU info", "error", err)
		return nil, false
	}

	var controllers []videoController
	if err := json.Unmarshal(output, &controllers); err != nil {
		slog.Error("failed to parse GPU info", "error", err)
		return nil, false
	}
	return controllers, true
}

func readThermalZoneTemperature() (float64, bool) {
	cmd := exec.Command("powershell", "-NoProfile", "-Command", `
		Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" | ForEach-Object {
			[PSCustomObject]@{
				Temperature = ($_.CurrentTemperature - 2732) / 10.0
			}
		} | ConvertTo-Json
	`)
	utils.SetHideWindow(cmd)
	output, err := cmd.Output()
	if err != nil {
		return 0, false
	}
	s := strings.TrimSpace(string(output))
	if s == "" {
		return 0, false
	}
	type zone struct {
		Temperature float64 `json:"Temperature"`
	}
	// ConvertTo-Json emits an object for one zone and an array for several
	if strings.HasPrefix(s, "[") {
		var temps []zone
		if err := json.Unmarshal([]byte(s), &temps); err != nil || len(temps) == 0 {
			return 0, false
		}
		return temps[0].Temperature, true
	}
	var one zone
	if err := json.Unmarshal([]byte(s), &one); err != nil {
		return 0, false
	}
	return one.Temperature, true
}
