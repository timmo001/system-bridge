package data_module

import (
	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/types"
)

func (t *Module) UpdateNetworksModule() (types.NetworksData, error) {
	log.Info("Getting networks data")

	var networksData types.NetworksData
	// Initialize arrays
	networksData.Connections = make([]types.NetworkConnection, 0)
	networksData.Networks = make([]types.Network, 0)

	// TODO: Implement
	return networksData, nil
}
