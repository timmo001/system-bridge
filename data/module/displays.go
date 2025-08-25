package data_module

import (
	"context"

	"log/slog"

	"github.com/timmo001/system-bridge/data/module/displays"
	"github.com/timmo001/system-bridge/types"
)

type DisplayModule struct{}

func (dm DisplayModule) Name() types.ModuleName { return types.ModuleDisplays }
func (dm DisplayModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting displays data")

	var displaysData types.DisplaysData
	displaysData = make([]types.Display, 0)

	displays, err := displays.GetDisplays()
	if err != nil {
		slog.Warn("Displays unavailable; returning default data", "error", err)
		return displaysData, nil
	}

	displaysData = displays
	return displaysData, nil
}
