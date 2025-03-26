package data_module

import "github.com/charmbracelet/log"

// MemorySwap represents swap memory information
type MemorySwap struct {
	Total   *int64   `json:"total,omitempty"`
	Used    *int64   `json:"used,omitempty"`
	Free    *float64 `json:"free,omitempty"`
	Percent *float64 `json:"percent,omitempty"`
	Sin     *int64   `json:"sin,omitempty"`
	Sout    *int64   `json:"sout,omitempty"`
}

// MemoryVirtual represents virtual memory information
type MemoryVirtual struct {
	Total     *int64   `json:"total,omitempty"`
	Available *int64   `json:"available,omitempty"`
	Percent   *float64 `json:"percent,omitempty"`
	Used      *int64   `json:"used,omitempty"`
	Free      *int64   `json:"free,omitempty"`
	Active    *int64   `json:"active,omitempty"`
	Inactive  *int64   `json:"inactive,omitempty"`
	Buffers   *int64   `json:"buffers,omitempty"`
	Cached    *int64   `json:"cached,omitempty"`
	Wired     *int64   `json:"wired,omitempty"`
	Shared    *int64   `json:"shared,omitempty"`
}

// MemoryData represents overall memory information
type MemoryData struct {
	Swap    *MemorySwap    `json:"swap,omitempty"`
	Virtual *MemoryVirtual `json:"virtual,omitempty"`
}

func (t *UpdateTask) UpdateMemoryModule() (MemoryData, error) {
	log.Info("Getting memory data")

	// TODO: Implement
	return MemoryData{}, nil
}
