package data_module

import (
	"context"
	"log/slog"

	"github.com/timmo001/system-bridge/data/module/bluetooth"
	"github.com/timmo001/system-bridge/types"
)

type BluetoothModule struct{}

func (bm BluetoothModule) Name() types.ModuleName { return types.ModuleBluetooth }
func (bm BluetoothModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting Bluetooth data")

	data, err := bluetooth.GetBluetoothData(ctx)
	if err != nil {
		slog.Info("Bluetooth devices unavailable", "error", err)
		return types.BluetoothData{Devices: []types.BluetoothDevice{}}, nil
	}
	return data, nil
}
