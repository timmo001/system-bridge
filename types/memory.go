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
}
