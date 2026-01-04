package data_module

import (
	"context"
	"runtime"

	"log/slog"

	"github.com/shirou/gopsutil/v4/mem"
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
		// On Linux, use available memory as free memory
		freeMemory := virtualMem.Free
		if runtime.GOOS == "linux" {
			freeMemory = virtualMem.Available
		}

		memoryData.Virtual = &types.MemoryVirtual{
			Total:     &virtualMem.Total,
			Available: &virtualMem.Available,
			Used:      &virtualMem.Used,
			Free:      &freeMemory,
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

	return memoryData, nil
}
