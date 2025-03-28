package data_module

import "github.com/charmbracelet/log"

// MemorySwap represents swap memory information
type MemorySwap struct {
	Total   *int64   `json:"total"`
	Used    *int64   `json:"used"`
	Free    *float64 `json:"free"`
	Percent *float64 `json:"percent"`
	Sin     *int64   `json:"sin"`
	Sout    *int64   `json:"sout"`
}

// MemoryVirtual represents virtual memory information
type MemoryVirtual struct {
	Total     *int64   `json:"total"`
	Available *int64   `json:"available"`
	Percent   *float64 `json:"percent"`
	Used      *int64   `json:"used"`
	Free      *int64   `json:"free"`
	Active    *int64   `json:"active"`
	Inactive  *int64   `json:"inactive"`
	Buffers   *int64   `json:"buffers"`
	Cached    *int64   `json:"cached"`
	Wired     *int64   `json:"wired"`
	Shared    *int64   `json:"shared"`
}

// MemoryData represents overall memory information
type MemoryData struct {
	Swap    *MemorySwap    `json:"swap"`
	Virtual *MemoryVirtual `json:"virtual"`
}

func (t *Module) UpdateMemoryModule() (MemoryData, error) {
	log.Info("Getting memory data")

	// TODO: Implement
	return MemoryData{}, nil
}
