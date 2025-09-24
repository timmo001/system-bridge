package data_module

import (
	"context"
	"runtime"
	"strings"
	"time"

	"log/slog"

	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/timmo001/system-bridge/data/module/memory"
	"github.com/timmo001/system-bridge/types"
)

type MemoryModule struct{}

func (mm MemoryModule) Name() types.ModuleName { return types.ModuleMemory }
func (mm MemoryModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting memory data")

	var memoryData types.MemoryData
	// Get virtual memory stats
	virtualMem, err := mem.VirtualMemory()
	if err != nil {
		slog.Error("Failed to get virtual memory", "error", err)
	} else {
		memoryData.Virtual = &types.MemoryVirtual{
			Total:     &virtualMem.Total,
			Available: &virtualMem.Available,
			Used:      &virtualMem.Used,
			Free:      &virtualMem.Free,
			Active:    &virtualMem.Active,
			Inactive:  &virtualMem.Inactive,
			Buffers:   &virtualMem.Buffers,
			Cached:    &virtualMem.Cached,
			Wired:     &virtualMem.Wired,
			Shared:    &virtualMem.Shared,
			Percent:   &virtualMem.UsedPercent,
		}
	}

	// Get swap memory stats
	swapMem, err := mem.SwapMemory()
	if err != nil {
		slog.Error("Failed to get swap memory", "error", err)
	} else {
		memoryData.Swap = &types.MemorySwap{
			Total:   &swapMem.Total,
			Used:    &swapMem.Used,
			Free:    &swapMem.Free,
			Percent: &swapMem.UsedPercent,
			Sin:     &swapMem.Sin,
			Sout:    &swapMem.Sout,
		}
	}

	// Get memory power consumption (Linux only)
	if runtime.GOOS == "linux" {
		infoStat, err := host.Info()
		if err == nil && (infoStat.OS == "linux" || infoStat.Platform == "linux" || 
			strings.Contains(strings.ToLower(infoStat.Platform), "arch") || 
			strings.Contains(strings.ToLower(infoStat.Platform), "ubuntu") || 
			strings.Contains(strings.ToLower(infoStat.Platform), "debian")) {
			
			if power := memory.GetMemoryPower(200 * time.Millisecond); power != nil {
				memoryData.Power = power
			}
		}
	}

	return memoryData, nil
}
