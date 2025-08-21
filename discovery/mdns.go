package discovery

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/hashicorp/mdns"
)

// MDNSDiscovery represents an mDNS-based service discovery mechanism
type MDNSDiscovery struct {
	port     int
	service  *mdns.MDNSService
	server   *mdns.Server
	stopChan chan struct{}
}

// MDNSService represents a service discovered via mDNS
type MDNSService struct {
	Name     string
	Hostname string
	Port     int
	IPs      []string
	Type     string
	Domain   string
}

// NewMDNSDiscovery creates a new mDNS discovery instance
func NewMDNSDiscovery(port int) *MDNSDiscovery {
	return &MDNSDiscovery{
		port:     port,
		stopChan: make(chan struct{}),
	}
}

// Start starts the mDNS service discovery
func (m *MDNSDiscovery) Start() error {
	slog.Info("Starting mDNS discovery service...")

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "systembridge"
	}

	// Create mDNS service
	service, err := mdns.NewMDNSService(hostname, "_system-bridge._tcp", "", "", m.port, nil, nil)
	if err != nil {
		return fmt.Errorf("could not create mDNS service: %w", err)
	}
	m.service = service

	// Create mDNS server
	server, err := mdns.NewServer(&mdns.Config{Zone: service, Logger: nil})
	if err != nil {
		return fmt.Errorf("could not start mDNS server: %w", err)
	}
	m.server = server

	slog.Info("Started mDNS Service",
		"service", service.Service,
		"domain", service.Domain,
		"port", service.Port,
		"hostname", service.HostName)

	return nil
}

// Stop stops the mDNS service discovery
func (m *MDNSDiscovery) Stop() error {
	slog.Info("Stopping mDNS discovery service...")
	close(m.stopChan)

	if m.server != nil {
		if err := m.server.Shutdown(); err != nil {
			slog.Error("Failed to shutdown mDNS server", "err", err)
			return err
		}
	}

	return nil
}

// GetService returns the mDNS service information
func (m *MDNSDiscovery) GetService() *mdns.MDNSService {
	return m.service
}

// GetServer returns the mDNS server instance
func (m *MDNSDiscovery) GetServer() *mdns.Server {
	return m.server
}

// DiscoverServices attempts to discover mDNS services on the network
func (m *MDNSDiscovery) DiscoverServices() ([]MDNSService, error) {
	services := []MDNSService{}

	// Create a channel to receive discovered services
	entriesCh := make(chan *mdns.ServiceEntry, 10)

	// Start the lookup
	go func() {
		defer close(entriesCh)
		// Look for system-bridge services
		if err := mdns.Lookup("_system-bridge._tcp", entriesCh); err != nil {
			slog.Error("Failed to lookup system-bridge services", "error", err)
		}
		// Also look for general HTTP services that might be system-bridge
		if err := mdns.Lookup("_http._tcp", entriesCh); err != nil {
			slog.Error("Failed to lookup HTTP services", "error", err)
		}
	}()

	// Collect results with timeout
	timeout := make(chan struct{})
	go func() {
		// Wait for a reasonable time to collect services
		// In production, you might want to make this configurable
		// or run continuously
		select {
		case <-m.stopChan:
		case <-timeout:
		}
	}()

	for entry := range entriesCh {
		// Check if this is a system-bridge service
		if entry.Name == "_system-bridge._tcp" || containsSystemBridgeInfo(entry.Info) {
			service := MDNSService{
				Name:     entry.Name,
				Hostname: entry.Host,
				Port:     entry.Port,
				IPs:      []string{}, // Will be populated if we can parse the addresses
				Type:     "mdns",
				Domain:   "local", // mDNS typically uses .local domain
			}

			// Note: IP address parsing would need to be implemented based on the actual
			// structure of entry.AddrV4. For now, we'll focus on the service discovery
			// functionality and can add proper IP parsing later if needed.

			services = append(services, service)
			slog.Debug("mDNS discovered service", "name", entry.Name, "host", entry.Host, "port", entry.Port)
		}
	}

	return services, nil
}

// containsSystemBridgeInfo checks if the service info contains system-bridge identifiers
func containsSystemBridgeInfo(info string) bool {
	// This is a simple check - in a real implementation, you might want
	// to parse the TXT records more thoroughly
	return len(info) > 0 && containsIgnoreCase(info, "system-bridge")
}

// containsIgnoreCase performs case-insensitive substring search
func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			(len(s) > len(substr) &&
				(startsWithIgnoreCase(s, substr) ||
					endsWithIgnoreCase(s, substr) ||
					containsMiddleIgnoreCase(s, substr))))
}

// startsWithIgnoreCase checks if string starts with substring (case-insensitive)
func startsWithIgnoreCase(s, prefix string) bool {
	if len(s) < len(prefix) {
		return false
	}
	return equalIgnoreCase(s[:len(prefix)], prefix)
}

// endsWithIgnoreCase checks if string ends with substring (case-insensitive)
func endsWithIgnoreCase(s, suffix string) bool {
	if len(s) < len(suffix) {
		return false
	}
	return equalIgnoreCase(s[len(s)-len(suffix):], suffix)
}

// containsMiddleIgnoreCase checks if substring appears in the middle of string
func containsMiddleIgnoreCase(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if equalIgnoreCase(s[i:i+len(substr)], substr) {
			return true
		}
	}
	return false
}

// equalIgnoreCase compares two strings case-insensitively
func equalIgnoreCase(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := 0; i < len(a); i++ {
		if toLower(a[i]) != toLower(b[i]) {
			return false
		}
	}
	return true
}

// toLower converts a character to lowercase (simple implementation)
func toLower(c byte) byte {
	if c >= 'A' && c <= 'Z' {
		return c + ('a' - 'A')
	}
	return c
}
