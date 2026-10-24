package data_module

import (
	"context"
	"log/slog"

	"github.com/timmo001/system-bridge/data/module/desktop"
	"github.com/timmo001/system-bridge/types"
)

type DesktopModule struct{}

func (dm DesktopModule) Name() types.ModuleName { return types.ModuleDesktop }
func (dm DesktopModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting desktop data")

	data, err := desktop.Get(ctx)
	if err != nil {
		return nil, err
	}
	// No supported compositor is running, so the module is null
	if data == nil {
		return nil, nil
	}
	return *data, nil
}
