package networks

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

// UpdateNetworksModule gathers network information and returns it
func UpdateNetworksModule() (types.NetworksData, error) {
	log.Info("Getting networks data")

	var networksData types.NetworksData
	// Initialize arrays
	networksData.Connections = make([]types.NetworkConnection, 0)
	networksData.Networks = make([]types.Network, 0)

	// Get network interfaces
	if err := gatherInterfaces(&networksData); err != nil {
		log.Error("Error gathering network interfaces", "error", err)
	}

	// Get network I/O statistics
	gatherIOStatistics(&networksData)

	// Get network connections
	gatherConnections(&networksData)

	return networksData, nil
}
