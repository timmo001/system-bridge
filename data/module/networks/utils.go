package networks

import (
	"fmt"
	"net"
)

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
