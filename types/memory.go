package types

// MemorySwap represents swap memory information
type MemorySwap struct {
	Total   *uint64  `json:"total"`
	Used    *uint64  `json:"used"`
	Free    *uint64  `json:"free"`
	Percent *float64 `json:"percent"`
	Sin     *uint64  `json:"sin"`
	Sout    *uint64  `json:"sout"`
}

// MemoryVirtual represents virtual memory information
type MemoryVirtual struct {
	Total     *uint64  `json:"total"`
	Available *uint64  `json:"available"`
	Percent   *float64 `json:"percent"`
	Used      *uint64  `json:"used"`
	Free      *uint64  `json:"free"`
	Active    *uint64  `json:"active"`
	Inactive  *uint64  `json:"inactive"`
	Buffers   *uint64  `json:"buffers"`
	Cached    *uint64  `json:"cached"`
	Wired     *uint64  `json:"wired"`
	Shared    *uint64  `json:"shared"`
}

// MemoryData represents overall memory information
type MemoryData struct {
	Swap    *MemorySwap    `json:"swap"`
	Virtual *MemoryVirtual `json:"virtual"`
	Power   *MemoryPower   `json:"power"`
}

// MemoryPower represents memory power consumption information
type MemoryPower struct {
	Total     *float64 `json:"total"`      // Total memory power consumption in watts
	PerModule []MemoryModulePower `json:"per_module"` // Per-module power consumption
}

// MemoryModulePower represents individual memory module power consumption
type MemoryModulePower struct {
	ID    int     `json:"id"`    // Memory module ID
	Power *float64 `json:"power"` // Power consumption in watts
}
