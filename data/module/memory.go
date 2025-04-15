package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateMemoryModule() (types.MemoryData, error) {
	log.Info("Getting memory data")

	var memoryData types.MemoryData

	// Get virtual memory stats
	virtualMem, err := mem.VirtualMemory()
	if err != nil {
		log.Errorf("Failed to get virtual memory: %v", err)
	} else {
		total := int64(virtualMem.Total)
		available := int64(virtualMem.Available)
		used := int64(virtualMem.Used)
		free := int64(virtualMem.Free)
		active := int64(virtualMem.Active)
		inactive := int64(virtualMem.Inactive)
		buffers := int64(virtualMem.Buffers)
		cached := int64(virtualMem.Cached)
		wired := int64(virtualMem.Wired)
		shared := int64(virtualMem.Shared)
		percent := float64(virtualMem.UsedPercent)

		memoryData.Virtual = &types.MemoryVirtual{
			Total:     &total,
			Available: &available,
			Used:      &used,
			Free:      &free,
			Active:    &active,
			Inactive:  &inactive,
			Buffers:   &buffers,
			Cached:    &cached,
			Wired:     &wired,
			Shared:    &shared,
			Percent:   &percent,
		}
	}

	// Get swap memory stats
	swapMem, err := mem.SwapMemory()
	if err != nil {
		log.Errorf("Failed to get swap memory: %v", err)
	} else {
		total := int64(swapMem.Total)
		used := int64(swapMem.Used)
		free := float64(swapMem.Free)
		percent := float64(swapMem.UsedPercent)
		sin := int64(swapMem.Sin)
		sout := int64(swapMem.Sout)

		memoryData.Swap = &types.MemorySwap{
			Total:   &total,
			Used:    &used,
			Free:    &free,
			Percent: &percent,
			Sin:     &sin,
			Sout:    &sout,
		}
	}

	return memoryData, nil
}
