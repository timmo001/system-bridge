package data_module

import (
	"context"
	"net"

	"fmt"

	"github.com/charmbracelet/log"
	psnet "github.com/shirou/gopsutil/v4/net"
	"github.com/timmo001/system-bridge/types"
)

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

// implement Updater interface
func (networksData NetworksData) Name() types.ModuleName { return types.ModuleNetworks }

// UpdateNetworksModule forwards the call to the networks module
func (networksData NetworksData) Update(ctx context.Context) (any, error) {
	networksData.gatherConnections()
	networksData.gatherIOStatistics()
	networksData.gatherInterfaces()
	return networksData, nil
}

// gatherConnections collects information about network connections
func (networksData *NetworksData) gatherConnections() {
	// Get network connections
	connections, err := psnet.Connections("all")
	if err != nil {
		log.Warn("Error getting network connections", "error", err)
		return
	}

	for _, conn := range connections {
		fd := int(conn.Fd)
		family := int(conn.Family)
		connType := int(conn.Type)

		// Format local and remote addresses
		laddr := fmt.Sprintf("%s:%d", conn.Laddr.IP, conn.Laddr.Port)
		raddr := fmt.Sprintf("%s:%d", conn.Raddr.IP, conn.Raddr.Port)

		pid := int(conn.Pid)

		netConn := NetworkConnection{
			FD:     &fd,
			Family: &family,
			Type:   &connType,
			LAddr:  &laddr,
			RAddr:  &raddr,
			Status: &conn.Status,
			PID:    &pid,
		}

		networksData.Connections = append(networksData.Connections, netConn)
	}
}

// gatherInterfaces collects information about network interfaces
func (networksData *NetworksData) gatherInterfaces() {
	// Get network interfaces using standard library
	ifaces, err := net.Interfaces()
	if err != nil {
		log.Error("error getting network interfaces", "err", err)
		return
	}

	// Process network interfaces
	for _, iface := range ifaces {
		name := iface.Name
		netif := Network{
			Name:      &name,
			Addresses: make([]NetworkAddress, 0),
			Stats:     &NetworkStats{},
		}

		// Get interface addresses
		addrs, err := iface.Addrs()
		if err != nil {
			log.Warn("Error getting addresses for interface", "interface", iface.Name, "error", err)
			continue
		}

		// Process addresses
		for _, addr := range addrs {
			var ipAddr, netmask, broadcast *string
			var family *string

			// Parse CIDR notation (e.g., 192.168.1.1/24)
			ipNet, isIPNet := addr.(*net.IPNet)
			if isIPNet {
				ip := ipNet.IP.String()
				ipAddr = &ip

				// Determine IP family
				fam := "IPv4"
				if ipNet.IP.To4() == nil {
					fam = "IPv6"
				}
				family = &fam

				// Get netmask in string format
				mask := formatNetmask(ipNet.Mask)
				netmask = &mask

				// Calculate broadcast address for IPv4
				if fam == "IPv4" {
					bcast := calculateBroadcast(ipNet.IP, ipNet.Mask)
					if bcast != "" {
						broadcast = &bcast
					}
				}
			} else {
				// Handle non-IPNet addresses (rare)
				addrStr := addr.String()
				ipAddr = &addrStr
				fam := "unknown"
				family = &fam
			}

			netAddr := NetworkAddress{
				Address:   ipAddr,
				Family:    family,
				Netmask:   netmask,
				Broadcast: broadcast,
			}

			netif.Addresses = append(netif.Addresses, netAddr)
		}

		// Set interface stats
		isUp := (iface.Flags & net.FlagUp) != 0
		netif.Stats.IsUp = &isUp

		// Set network interface duplex mode (typically unknown without platform-specific code)
		duplex := "unknown"
		netif.Stats.Duplex = &duplex

		// Set network interface speed
		speed := 0
		if len(iface.HardwareAddr) > 0 {
			// Assume 1Gbps for physical interfaces (just a placeholder)
			speed = 1000
		}
		netif.Stats.Speed = &speed

		// Set MTU
		mtu := iface.MTU
		netif.Stats.MTU = &mtu

		// Set flags
		flags := make([]string, 0)
		if (iface.Flags & net.FlagUp) != 0 {
			flags = append(flags, "up")
		}
		if (iface.Flags & net.FlagBroadcast) != 0 {
			flags = append(flags, "broadcast")
		}
		if (iface.Flags & net.FlagLoopback) != 0 {
			flags = append(flags, "loopback")
		}
		if (iface.Flags & net.FlagPointToPoint) != 0 {
			flags = append(flags, "pointtopoint")
		}
		if (iface.Flags & net.FlagMulticast) != 0 {
			flags = append(flags, "multicast")
		}
		netif.Stats.Flags = flags

		networksData.Networks = append(networksData.Networks, netif)
	}
}

// gatherIOStatistics collects network I/O statistics
func (networksData *NetworksData) gatherIOStatistics() {
	// Get network I/O stats for all interfaces combined
	ioTotal, err := psnet.IOCounters(false) // pernic=false for total stats
	if err != nil {
		log.Warn("Error getting total network I/O counters", "error", err)
		return
	}

	if len(ioTotal) == 0 {
		return
	}

	io := ioTotal[0] // Get the aggregate stats

	bytesSent := int64(io.BytesSent)
	bytesRecv := int64(io.BytesRecv)
	packetsSent := int64(io.PacketsSent)
	packetsRecv := int64(io.PacketsRecv)
	errIn := int64(io.Errin)
	errOut := int64(io.Errout)
	dropIn := int64(io.Dropin)
	dropOut := int64(io.Dropout)

	networkIO := NetworkIO{
		BytesSent:   &bytesSent,
		BytesRecv:   &bytesRecv,
		PacketsSent: &packetsSent,
		PacketsRecv: &packetsRecv,
		ErrIn:       &errIn,
		ErrOut:      &errOut,
		DropIn:      &dropIn,
		DropOut:     &dropOut,
	}

	networksData.IO = &networkIO
}

// formatNetmask converts a net.IPMask to a human-readable string
func formatNetmask(mask net.IPMask) string {
	if len(mask) == 0 {
		return ""
	}

	// For IPv4 masks, return in dot notation (e.g., 255.255.255.0)
	if len(mask) == 4 {
		return fmt.Sprintf("%d.%d.%d.%d", mask[0], mask[1], mask[2], mask[3])
	}

	// For IPv6, return the mask length
	ones, _ := mask.Size()
	return fmt.Sprintf("/%d", ones)
}

// calculateBroadcast calculates the broadcast address for an IPv4 address and netmask
func calculateBroadcast(ip net.IP, mask net.IPMask) string {
	if ip.To4() == nil {
		return "" // Not an IPv4 address
	}

	broadcast := net.IP(make([]byte, 4))
	for i := range 4 {
		broadcast[i] = ip.To4()[i] | ^mask[i]
	}
	return broadcast.String()
}
