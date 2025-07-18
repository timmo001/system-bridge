package networks

import (
	"fmt"
	"net"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// GatherInterfaces collects information about network interfaces
func GatherInterfaces(networksData *types.NetworksData) error {
	// Get network interfaces using standard library
	ifaces, err := net.Interfaces()
	if err != nil {
		return fmt.Errorf("error getting network interfaces: %w", err)
	}

	// Process network interfaces
	for _, iface := range ifaces {
		name := iface.Name
		netif := types.Network{
			Name:      &name,
			Addresses: make([]types.NetworkAddress, 0),
			Stats:     &types.NetworkStats{},
		}

		// Get interface addresses
		addrs, err := iface.Addrs()
		if err != nil {
			slog.Warn("Error getting addresses for interface", "interface", iface.Name, "error", err)
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

			netAddr := types.NetworkAddress{
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

	return nil
}
