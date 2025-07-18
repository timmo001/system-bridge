package data_module

import (
	"context"

	"log/slog"

	"github.com/timmo001/system-bridge/data/module/networks"
	"github.com/timmo001/system-bridge/types"
)

// implement Updater interface
type NetworkModule struct{}

func (nm NetworkModule) Name() types.ModuleName { return types.ModuleNetworks }

// UpdateNetworksModule forwards the call to the networks module
func (nm NetworkModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting disks data")

	var networksData types.NetworksData
	// Initialize arrays
	networksData.Connections = make([]types.NetworkConnection, 0)
	networksData.Networks = make([]types.Network, 0)

	networks.GatherConnections(&networksData)

	networks.GatherIOStatistics(&networksData)

	err := networks.GatherInterfaces(&networksData)
	if err != nil {
		slog.Error("Error gathering network interfaces", "error", err)
	}
	return networksData, nil
}
