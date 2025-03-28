package data_module

import "github.com/charmbracelet/log"

// NetworkAddress represents information about a network address
type NetworkAddress struct {
	Address   *string `json:"address"`
	Family    *string `json:"family"`
	Netmask   *string `json:"netmask"`
	Broadcast *string `json:"broadcast"`
	PTP       *string `json:"ptp"`
}

// NetworkStats represents network interface statistics
type NetworkStats struct {
	IsUp   *bool    `json:"isup"`
	Duplex *string  `json:"duplex"`
	Speed  *int     `json:"speed"`
	MTU    *int     `json:"mtu"`
	Flags  []string `json:"flags"`
}

// NetworkConnection represents a network connection
type NetworkConnection struct {
	FD     *int    `json:"fd"`
	Family *int    `json:"family"`
	Type   *int    `json:"type"`
	LAddr  *string `json:"laddr"`
	RAddr  *string `json:"raddr"`
	Status *string `json:"status"`
	PID    *int    `json:"pid"`
}

// NetworkIO represents network I/O statistics
type NetworkIO struct {
	BytesSent   *int64 `json:"bytes_sent"`
	BytesRecv   *int64 `json:"bytes_recv"`
	PacketsSent *int64 `json:"packets_sent"`
	PacketsRecv *int64 `json:"packets_recv"`
	ErrIn       *int64 `json:"errin"`
	ErrOut      *int64 `json:"errout"`
	DropIn      *int64 `json:"dropin"`
	DropOut     *int64 `json:"dropout"`
}

// Network represents information about a network interface
type Network struct {
	Name      *string          `json:"name"`
	Addresses []NetworkAddress `json:"addresses"`
	Stats     *NetworkStats    `json:"stats"`
}

// NetworksData represents information about all network interfaces and connections
type NetworksData struct {
	Connections []NetworkConnection `json:"connections"`
	IO          *NetworkIO          `json:"io"`
	Networks    []Network           `json:"networks"`
}

func (t *Module) UpdateNetworksModule() (NetworksData, error) {
	log.Info("Getting networks data")

	var networksData NetworksData
	// Initialize arrays
	networksData.Connections = make([]NetworkConnection, 0)
	networksData.Networks = make([]Network, 0)

	// TODO: Implement
	return networksData, nil
}
