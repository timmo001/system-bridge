package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/timmo001/system-bridge/types"
)

// MemorySwap represents swap memory information
type MemorySwap struct {
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
	Percent float64 `json:"percent"`
	Sin     uint64  `json:"sin"`
	Sout    uint64  `json:"sout"`
}

// MemoryVirtual represents virtual memory information
type MemoryVirtual struct {
	Total     uint64  `json:"total"`
	Available uint64  `json:"available"`
	Percent   float64 `json:"percent"`
	Used      uint64  `json:"used"`
	Free      uint64  `json:"free"`
	Active    uint64  `json:"active"`
	Inactive  uint64  `json:"inactive"`
	Buffers   uint64  `json:"buffers"`
	Cached    uint64  `json:"cached"`
	Wired     uint64  `json:"wired"`
	Shared    uint64  `json:"shared"`
}

// MemoryData represents overall memory information
type MemoryData struct {
	Swap    MemorySwap    `json:"swap"`
	Virtual MemoryVirtual `json:"virtual"`
}

func (memoryData MemoryData) Name() types.ModuleName { return types.ModuleMemory }

func (memoryData MemoryData) Update(ctx context.Context) (any, error) {
	log.Info("Getting memory data")

	// Get virtual memory stats
	virtualMem, err := mem.VirtualMemory()
	if err != nil {
		log.Errorf("Failed to get virtual memory: %v", err)
	} else {
		memoryData.Virtual = MemoryVirtual{
			Total:     virtualMem.Total,
			Available: virtualMem.Available,
			Used:      virtualMem.Used,
			Free:      virtualMem.Free,
			Active:    virtualMem.Active,
			Inactive:  virtualMem.Inactive,
			Buffers:   virtualMem.Buffers,
			Cached:    virtualMem.Cached,
			Wired:     virtualMem.Wired,
			Shared:    virtualMem.Shared,
			Percent:   virtualMem.UsedPercent,
		}
	}

	// Get swap memory stats
	swapMem, err := mem.SwapMemory()
	if err != nil {
		log.Errorf("Failed to get swap memory: %v", err)
	} else {
		memoryData.Swap = MemorySwap{
			Total:   swapMem.Total,
			Used:    swapMem.Used,
			Free:    swapMem.Free,
			Percent: swapMem.UsedPercent,
			Sin:     swapMem.Sin,
			Sout:    swapMem.Sout,
		}
	}

	return memoryData, nil
}
