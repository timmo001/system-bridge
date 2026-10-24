package types

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

// NetworkIO represents network I/O statistics. The rates are in bytes per
// second since the previous reading, and are null on the first reading.
type NetworkIO struct {
	BytesSent     *int64   `json:"bytes_sent"`
	BytesRecv     *int64   `json:"bytes_recv"`
	PacketsSent   *int64   `json:"packets_sent"`
	PacketsRecv   *int64   `json:"packets_recv"`
	ErrIn         *int64   `json:"errin"`
	ErrOut        *int64   `json:"errout"`
	DropIn        *int64   `json:"dropin"`
	DropOut       *int64   `json:"dropout"`
	BytesSentRate *float64 `json:"bytes_sent_rate"`
	BytesRecvRate *float64 `json:"bytes_recv_rate"`
}

// NetworkWifi represents a wireless interface's connection. The fields are
// null while the interface isn't connected.
type NetworkWifi struct {
	SSID          *string  `json:"ssid"`
	Signal        *int     `json:"signal"`
	SignalPercent *int     `json:"signal_percent"`
	LinkRate      *float64 `json:"link_rate"`
}

// Network represents information about a network interface. Wifi is null for
// interfaces that aren't wireless.
type Network struct {
	Name      *string          `json:"name"`
	Addresses []NetworkAddress `json:"addresses"`
	Stats     *NetworkStats    `json:"stats"`
	IO        *NetworkIO       `json:"io"`
	Wifi      *NetworkWifi     `json:"wifi"`
}

// NetworksData represents information about all network interfaces and connections
type NetworksData struct {
	Connections []NetworkConnection `json:"connections"`
	IO          *NetworkIO          `json:"io"`
	Networks    []Network           `json:"networks"`
}
