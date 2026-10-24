package data_module

import (
	"context"

	"log/slog"

	"github.com/timmo001/system-bridge/data/module/battery"
	"github.com/timmo001/system-bridge/types"
)

type BatteryModule struct{}

func (batteryModule BatteryModule) Name() types.ModuleName { return types.ModuleBattery }
func (batteryModule BatteryModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting battery data")
	return battery.Gather(), nil
}
