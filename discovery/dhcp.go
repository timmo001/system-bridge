package discovery

import (
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"strings"
	"time"
)

// DHCPDiscovery represents a DHCP-based service discovery mechanism
type DHCPDiscovery struct {
	port     int
	stopChan chan struct{}
}

// DHCPService represents a service discovered via DHCP
type DHCPService struct {
	IP       string
	Port     int
	Hostname string
	Domain   string
}

// NewDHCPDiscovery creates a new DHCP discovery instance
func NewDHCPDiscovery(port int) *DHCPDiscovery {
	return &DHCPDiscovery{
		port:     port,
		stopChan: make(chan struct{}),
	}
}

// Start starts the DHCP discovery service
func (d *DHCPDiscovery) Start() error {
	slog.Info("Starting DHCP discovery service...")

	// Start DHCP listener
	go d.listenForDHCP()

	// Start periodic DHCP requests
	go d.sendDHCPRequests()

	return nil
}

// Stop stops the DHCP discovery service
func (d *DHCPDiscovery) Stop() error {
	slog.Info("Stopping DHCP discovery service...")
	close(d.stopChan)
	return nil
}

// listenForDHCP listens for DHCP responses
func (d *DHCPDiscovery) listenForDHCP() {
	// Create UDP connection for DHCP (server port 67, client port 68)
	conn, err := net.ListenUDP("udp", &net.UDPAddr{IP: net.IPv4zero, Port: 68})
	if err != nil {
		slog.Error("Failed to create DHCP listener", "err", err)
		return
	}
	defer conn.Close()

	buf := make([]byte, 1024)

	for {
		select {
		case <-d.stopChan:
			return
		default:
			if err := conn.SetReadDeadline(time.Now().Add(time.Second)); err != nil {
				slog.Warn("Failed to set DHCP read deadline", "err", err)
				continue
			}

			n, addr, err := conn.ReadFromUDP(buf)
			if err != nil {
				if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
					continue
				}
				slog.Error("Failed to read DHCP packet", "err", err)
				continue
			}

			d.handleDHCPPacket(buf[:n], addr)
		}
	}
}

// handleDHCPPacket processes incoming DHCP packets
func (d *DHCPDiscovery) handleDHCPPacket(data []byte, addr *net.UDPAddr) {
	if len(data) < 240 {
		return // DHCP packet too small
	}

	// Parse DHCP packet
	// This is a simplified DHCP parser - in production, you'd want a more robust implementation
	op := data[0]
	if op != 2 { // BOOTREPLY
		return
	}

	// Extract IP address
	yiaddr := net.IP(data[16:20])

	// Look for vendor-specific options that might contain service information
	options := data[240:]
	d.parseDHCPOptions(options, yiaddr.String())
}

// parseDHCPOptions parses DHCP options for service discovery information
func (d *DHCPDiscovery) parseDHCPOptions(options []byte, ip string) {
	i := 0
	for i < len(options) {
		if options[i] == 255 { // End option
			break
		}

		if i+1 >= len(options) {
			break
		}

		optionCode := options[i]
		optionLen := int(options[i+1])
		i += 2

		if i+optionLen > len(options) {
			break
		}

		optionData := options[i : i+optionLen]
		i += optionLen

		d.handleDHCPOption(optionCode, optionData, ip)
	}
}

// handleDHCPOption processes individual DHCP options
func (d *DHCPDiscovery) handleDHCPOption(code byte, data []byte, ip string) {
	switch code {
	case 12: // Host Name
		hostname := string(data)
		slog.Debug("DHCP discovered hostname", "ip", ip, "hostname", hostname)

	case 43: // Vendor Specific Information
		d.parseVendorSpecificInfo(data, ip)

	case 60: // Vendor Class Identifier
		vendorClass := string(data)
		if strings.Contains(vendorClass, "system-bridge") {
			slog.Info("DHCP discovered System Bridge service", "ip", ip, "vendor", vendorClass)
		}
	}
}

// parseVendorSpecificInfo parses vendor-specific DHCP options
func (d *DHCPDiscovery) parseVendorSpecificInfo(data []byte, ip string) {
	// Look for system-bridge specific information in vendor options
	vendorData := string(data)
	if strings.Contains(vendorData, "system-bridge") {
		slog.Info("DHCP discovered System Bridge via vendor options", "ip", ip, "data", vendorData)
	}
}

// sendDHCPRequests sends DHCP discovery requests
func (d *DHCPDiscovery) sendDHCPRequests() {
	// Create UDP connection for sending DHCP requests
	conn, err := net.DialUDP("udp", nil, &net.UDPAddr{IP: net.IPv4bcast, Port: 67})
	if err != nil {
		slog.Error("Failed to create DHCP sender", "err", err)
		return
	}
	defer conn.Close()

	ticker := time.NewTicker(60 * time.Second) // Send DHCP requests every minute
	defer ticker.Stop()

	for {
		select {
		case <-d.stopChan:
			return
		case <-ticker.C:
			d.sendDHCPDiscover(conn)
		}
	}
}

// sendDHCPDiscover sends a DHCP discover packet
func (d *DHCPDiscovery) sendDHCPDiscover(conn *net.UDPConn) {
	// Create a basic DHCP discover packet
	// This is a simplified implementation - in production, you'd want a proper DHCP client library
	dhcpPacket := d.createDHCPDiscoverPacket()

	if _, err := conn.Write(dhcpPacket); err != nil {
		slog.Error("Failed to send DHCP discover", "err", err)
	} else {
		slog.Debug("Sent DHCP discover packet")
	}
}

// createDHCPDiscoverPacket creates a DHCP discover packet
func (d *DHCPDiscovery) createDHCPDiscoverPacket() []byte {
	// This is a very basic DHCP discover packet structure
	// In a real implementation, you'd use a proper DHCP library
	packet := make([]byte, 300)

	// DHCP packet header
	packet[0] = 1 // BOOTREQUEST
	packet[1] = 1 // Ethernet
	packet[2] = 6 // Hardware address length
	packet[3] = 0 // Hops

	// Transaction ID (use current timestamp)
	txID := uint32(time.Now().Unix())
	packet[4] = byte(txID >> 24)
	packet[5] = byte(txID >> 16)
	packet[6] = byte(txID >> 8)
	packet[7] = byte(txID)

	// DHCP options start at offset 240
	options := packet[240:]

	// DHCP Message Type (53) - DHCP Discover
	options[0] = 53 // Option code
	options[1] = 1  // Length
	options[2] = 1  // DHCP Discover

	// Vendor Class Identifier (60) - System Bridge
	vci := "system-bridge"
	options[3] = 60             // Option code
	options[4] = byte(len(vci)) // Length
	copy(options[5:], []byte(vci))

	// End option
	options[5+len(vci)] = 255

	return packet
}

// DiscoverServices attempts to discover System Bridge services on the network
func (d *DHCPDiscovery) DiscoverServices() ([]DHCPService, error) {
	services := []DHCPService{}

	// Get local network interfaces
	interfaces, err := net.Interfaces()
	if err != nil {
		return services, fmt.Errorf("failed to get network interfaces: %w", err)
	}

	for _, iface := range interfaces {
		// Skip loopback and down interfaces
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && ipnet.IP.To4() != nil {
				// Scan the subnet for System Bridge services
				services = append(services, d.scanSubnet(ipnet)...)
			}
		}
	}

	return services, nil
}

// scanSubnet scans a subnet for System Bridge services
func (d *DHCPDiscovery) scanSubnet(ipnet *net.IPNet) []DHCPService {
	services := []DHCPService{}
	ip := ipnet.IP.Mask(ipnet.Mask)

	// Calculate the number of hosts in the subnet
	ones, bits := ipnet.Mask.Size()
	hostCount := 1 << uint(bits-ones)

	// Scan first 254 hosts (skip network and broadcast addresses)
	for i := 1; i < hostCount-1 && i < 255; i++ {
		// Increment IP address
		for j := len(ip) - 1; j >= 0; j-- {
			ip[j]++
			if ip[j] > 0 {
				break
			}
		}

		// Try to connect to the System Bridge port
		address := ip.String() + ":" + strconv.Itoa(d.port)
		conn, err := net.DialTimeout("tcp", address, 100*time.Millisecond)
		if err != nil {
			continue
		}
		conn.Close()

		// If connection successful, add to services
		service := DHCPService{
			IP:       ip.String(),
			Port:     d.port,
			Hostname: fmt.Sprintf("system-bridge-%s", ip.String()),
		}
		services = append(services, service)
		slog.Info("DHCP discovered System Bridge service", "ip", ip.String(), "port", d.port)
	}

	return services
}
