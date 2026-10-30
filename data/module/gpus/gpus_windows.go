//go:build windows

package gpus

import (
	"errors"
	"fmt"
	"math"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/data/module/cpu"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

func getGPUs() ([]types.GPU, error) {
	gpus := make([]types.GPU, 0)

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
	// non-NVIDIA or when nvidia-smi unavailable), shared with the CPU module.
	if len(gpus) > 0 && gpus[0].Temperature == nil {
		gpus[0].Temperature = cpu.ReadCPUTemperature()
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
	ID          string
	Name        string
	MemoryTotal float64
}

var videoControllerCache = utils.TTLValue[[]videoController]{TTL: staticTTL, FailTTL: unavailableTTL}

func readVideoControllers() ([]videoController, bool) {
	var adapters []struct {
		DeviceID   string
		Name       string
		AdapterRAM *uint32
	}
	if err := utils.QueryWMI("", "SELECT DeviceID, Name, AdapterRAM FROM Win32_VideoController", &adapters); err != nil {
		slog.Error("failed to get GPU info", "error", err)
		return nil, false
	}

	controllers := make([]videoController, 0, len(adapters))
	for _, adapter := range adapters {
		var memoryTotal float64
		if adapter.AdapterRAM != nil {
			// Reported in whole GiB
			memoryTotal = math.RoundToEven(float64(*adapter.AdapterRAM) / (1 << 30))
		}
		controllers = append(controllers, videoController{
			ID:          adapter.DeviceID,
			Name:        adapter.Name,
			MemoryTotal: memoryTotal,
		})
	}
	return controllers, true
}
