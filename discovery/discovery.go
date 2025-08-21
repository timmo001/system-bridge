package discovery

import (
	"fmt"
	"log/slog"
	"sync"
)

// DiscoveryManager manages all service discovery mechanisms
type DiscoveryManager struct {
	port       int
	ssdpServer *SSDPServer
	dhcpDisc   *DHCPDiscovery
	mu         sync.RWMutex
	running    bool
}

// ServiceInfo represents a discovered service
type ServiceInfo struct {
	IP       string
	Port     int
	Hostname string
	Type     string // "ssdp", "dhcp", "mdns"
	Location string // For SSDP
}

// NewDiscoveryManager creates a new discovery manager
func NewDiscoveryManager(port int) *DiscoveryManager {
	return &DiscoveryManager{
		port: port,
	}
}

// Start starts all discovery services
func (dm *DiscoveryManager) Start() error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	if dm.running {
		return fmt.Errorf("discovery manager is already running")
	}

	slog.Info("Starting service discovery manager...")

	// Start SSDP server
	dm.ssdpServer = NewSSDPServer(dm.port)
	if err := dm.ssdpServer.Start(); err != nil {
		return fmt.Errorf("failed to start SSDP server: %w", err)
	}

	// Start DHCP discovery
	dm.dhcpDisc = NewDHCPDiscovery(dm.port)
	if err := dm.dhcpDisc.Start(); err != nil {
		slog.Warn("Failed to start DHCP discovery", "err", err)
		// Don't return error, continue with other services
	}

	dm.running = true
	slog.Info("Service discovery manager started successfully")
	return nil
}

// Stop stops all discovery services
func (dm *DiscoveryManager) Stop() error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	if !dm.running {
		return nil
	}

	slog.Info("Stopping service discovery manager...")

	if dm.ssdpServer != nil {
		if err := dm.ssdpServer.Stop(); err != nil {
			slog.Error("Failed to stop SSDP server", "err", err)
		}
	}

	if dm.dhcpDisc != nil {
		if err := dm.dhcpDisc.Stop(); err != nil {
			slog.Error("Failed to stop DHCP discovery", "err", err)
		}
	}

	dm.running = false
	slog.Info("Service discovery manager stopped")
	return nil
}

// IsRunning returns whether the discovery manager is running
func (dm *DiscoveryManager) IsRunning() bool {
	dm.mu.RLock()
	defer dm.mu.RUnlock()
	return dm.running
}

// DiscoverServices attempts to discover all available System Bridge services
func (dm *DiscoveryManager) DiscoverServices() ([]ServiceInfo, error) {
	dm.mu.RLock()
	defer dm.mu.RUnlock()

	if !dm.running {
		return nil, fmt.Errorf("discovery manager is not running")
	}

	var services []ServiceInfo

	// DHCP-based discovery
	if dm.dhcpDisc != nil {
		dhcpServices, err := dm.dhcpDisc.DiscoverServices()
		if err != nil {
			slog.Warn("DHCP service discovery failed", "err", err)
		} else {
			for _, service := range dhcpServices {
				services = append(services, ServiceInfo{
					IP:       service.IP,
					Port:     service.Port,
					Hostname: service.Hostname,
					Type:     "dhcp",
				})
			}
		}
	}

	// Note: SSDP services are discovered asynchronously via multicast
	// They would be tracked in a separate registry

	slog.Info("Service discovery completed", "found", len(services))
	return services, nil
}

// GetSSDPService returns the SSDP server instance
func (dm *DiscoveryManager) GetSSDPService() *SSDPServer {
	dm.mu.RLock()
	defer dm.mu.RUnlock()
	return dm.ssdpServer
}

// GetDHCPDiscovery returns the DHCP discovery instance
func (dm *DiscoveryManager) GetDHCPDiscovery() *DHCPDiscovery {
	dm.mu.RLock()
	defer dm.mu.RUnlock()
	return dm.dhcpDisc
}
