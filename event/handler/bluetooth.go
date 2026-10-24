package event_handler

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/data/module/bluetooth"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

// bluetoothTimeout allows for a device that takes a while to answer when
// connecting
const bluetoothTimeout = 30 * time.Second

type BluetoothDeviceRequestData struct {
	Address string `json:"address" mapstructure:"address"`
}

type BluetoothPowerRequestData struct {
	Powered *bool `json:"powered" mapstructure:"powered"`
}

func RegisterBluetoothHandlers(router *event.MessageRouter, dataStore *data.DataStore) {
	validateAddress := func(request BluetoothDeviceRequestData) string {
		return required(request.Address, "No device address provided")
	}

	registerAction(router, dataStore, types.ModuleBluetooth, bluetoothTimeout, event.EventBluetoothConnect, event.ResponseTypeBluetoothConnected, "Device connected",
		validateAddress,
		func(ctx context.Context, request BluetoothDeviceRequestData) error {
			return bluetooth.Connect(ctx, request.Address)
		})
	registerAction(router, dataStore, types.ModuleBluetooth, bluetoothTimeout, event.EventBluetoothDisconnect, event.ResponseTypeBluetoothDisconnected, "Device disconnected",
		validateAddress,
		func(ctx context.Context, request BluetoothDeviceRequestData) error {
			return bluetooth.Disconnect(ctx, request.Address)
		})
	registerAction(router, dataStore, types.ModuleBluetooth, bluetoothTimeout, event.EventBluetoothForget, event.ResponseTypeBluetoothForgotten, "Device forgotten",
		validateAddress,
		func(ctx context.Context, request BluetoothDeviceRequestData) error {
			return bluetooth.Forget(ctx, request.Address)
		})
	registerAction(router, dataStore, types.ModuleBluetooth, bluetoothTimeout, event.EventBluetoothSetPower, event.ResponseTypeBluetoothPowerSet, "Bluetooth turned on or off",
		func(request BluetoothPowerRequestData) string {
			if request.Powered == nil {
				return "Provide powered"
			}
			return ""
		},
		func(ctx context.Context, request BluetoothPowerRequestData) error {
			return bluetooth.SetPowered(ctx, *request.Powered)
		})
}
