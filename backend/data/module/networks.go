package data_module

import (
	"github.com/timmo001/system-bridge/backend/data/module/networks"
	"github.com/timmo001/system-bridge/types"
)

// UpdateNetworksModule forwards the call to the networks module
func (t *Module) UpdateNetworksModule() (types.NetworksData, error) {
	return networks.UpdateNetworksModule()
}
