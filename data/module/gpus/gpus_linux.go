//go:build linux

package gpus

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

func getGPUs() ([]types.GPU, error) {
	gpuList := make([]types.GPU, 0)

	// Try to get NVIDIA GPU info first
	cmd := exec.Command("nvidia-smi", "--query-gpu=gpu_name,memory.total,memory.used,memory.free,utilization.gpu,clocks.current.graphics,clocks.current.memory,power.draw,temperature.gpu", "--format=csv,noheader,nounits")
	output, err := cmd.Output()
	if err == nil {
		lines := strings.Split(string(output), "\n")
		for _, line := range lines {
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

				memoryLoad := 0.0
				if memoryTotal > 0 {
					memoryLoad = (memoryUsed / memoryTotal) * 100.0
				}

				gpuList = append(gpuList, types.GPU{
					ID:          fmt.Sprintf("nvidia-%d", len(gpuList)),
					Name:        name,
					CoreClock:   &coreClock,
					CoreLoad:    &coreLoad,
					MemoryClock: &memoryClock,
					MemoryLoad:  &memoryLoad,
					MemoryFree:  &memoryFree,
					MemoryUsed:  &memoryUsed,
					MemoryTotal: &memoryTotal,
					PowerUsage:  &powerUsage,
					Temperature: &temperature,
				})
			}
		}
	}

	// If no NVIDIA GPUs found, try to get basic GPU info from lspci
	if len(gpuList) == 0 {
		cmd = exec.Command("lspci", "-v")
		output, err = cmd.Output()
		if err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				if strings.Contains(line, "VGA compatible controller") {
					// lspci format: "0000:00:02.0 VGA compatible controller: Intel Corporation..."
					// Split by ": " to skip past the bus address and class description
					idx := strings.Index(line, ": ")
					if idx >= 0 {
						rest := line[idx+2:]
						nameIdx := strings.Index(rest, ": ")
						if nameIdx >= 0 {
							name := strings.TrimSpace(rest[nameIdx+2:])
							gpuList = append(gpuList, types.GPU{
								ID:   fmt.Sprintf("gpu-%d", len(gpuList)),
								Name: name,
							})
						}
					}
				}
			}
		}
	}

	return gpuList, nil
}
