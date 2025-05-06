package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/displays"
	"github.com/timmo001/system-bridge/types"
)

// DisplaysData represents information about all display devices
type DisplaysData struct {
}

func (displaysData DisplaysData) Name() types.ModuleName { return types.ModuleDisplays }
func (displaysData DisplaysData) Update(ctx context.Context) (any, error) {
	log.Info("Getting displays data")

	displays, err := displays.GetDisplays()
	if err != nil {
		log.Error("failed to get display info", "error", err)
		return displaysData, err
	}

	return displays, nil
}
