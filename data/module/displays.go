package data_module

import (
	"context"

	"github.com/charmbracelet/log"
	"github.com/timmo001/system-bridge/data/module/displays"
	"github.com/timmo001/system-bridge/types"
)

type DisplayModule struct{}

func (dm DisplayModule) Name() types.ModuleName { return types.ModuleDisplays }
func (dm DisplayModule) Update(ctx context.Context) (any, error) {
	log.Info("Getting displays data")

	var displaysData types.DisplaysData
	displaysData = make([]types.Display, 0)

	displays, err := displays.GetDisplays()
	if err != nil {
		log.Error("failed to get display info", "error", err)
		return displaysData, err
	}

	displaysData = displays
	return displaysData, nil
}
