package data_module

import "github.com/charmbracelet/log"

// NetworkAddress represents information about a network address
type NetworkAddress struct {
	Address   *string `json:"address,omitempty"`
	Family    *string `json:"family,omitempty"`
	Netmask   *string `json:"netmask,omitempty"`
	Broadcast *string `json:"broadcast,omitempty"`
	PTP       *string `json:"ptp,omitempty"`
}

// NetworkStats represents network interface statistics
type NetworkStats struct {
	IsUp   *bool    `json:"isup,omitempty"`
	Duplex *string  `json:"duplex,omitempty"`
	Speed  *int     `json:"speed,omitempty"`
	MTU    *int     `json:"mtu,omitempty"`
	Flags  []string `json:"flags,omitempty"`
}

// NetworkConnection represents a network connection
type NetworkConnection struct {
	FD     *int    `json:"fd,omitempty"`
	Family *int    `json:"family,omitempty"`
	Type   *int    `json:"type,omitempty"`
	LAddr  *string `json:"laddr,omitempty"`
	RAddr  *string `json:"raddr,omitempty"`
	Status *string `json:"status,omitempty"`
	PID    *int    `json:"pid,omitempty"`
}

// NetworkIO represents network I/O statistics
type NetworkIO struct {
	BytesSent   *int64 `json:"bytes_sent,omitempty"`
	BytesRecv   *int64 `json:"bytes_recv,omitempty"`
	PacketsSent *int64 `json:"packets_sent,omitempty"`
	PacketsRecv *int64 `json:"packets_recv,omitempty"`
	ErrIn       *int64 `json:"errin,omitempty"`
	ErrOut      *int64 `json:"errout,omitempty"`
	DropIn      *int64 `json:"dropin,omitempty"`
	DropOut     *int64 `json:"dropout,omitempty"`
}

// Network represents information about a network interface
type Network struct {
	Name      *string          `json:"name,omitempty"`
	Addresses []NetworkAddress `json:"addresses,omitempty"`
	Stats     *NetworkStats    `json:"stats,omitempty"`
}

// NetworksData represents information about all network interfaces and connections
type NetworksData struct {
	Connections []NetworkConnection `json:"connections,omitempty"`
	IO          *NetworkIO          `json:"io,omitempty"`
	Networks    []Network           `json:"networks,omitempty"`
}

func (t *UpdateTask) UpdateNetworksModule() (NetworksData, error) {
	log.Info("Getting networks data")

	// TODO: Implement
	return NetworksData{}, nil
}
