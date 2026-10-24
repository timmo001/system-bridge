package main

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/client"
	"github.com/timmo001/system-bridge/event"
	"github.com/urfave/cli/v3"
)

// bluetoothDeviceCommand is a command that sends an event for the device it's
// given
func bluetoothDeviceCommand(name string, usage string, eventType event.EventType) *cli.Command {
	return &cli.Command{
		Name:      name,
		Usage:     usage,
		ArgsUsage: "<device address>",
		Action: func(cmdCtx context.Context, cmd *cli.Command) error {
			address := cmd.Args().First()
			if address == "" {
				return fmt.Errorf("a device address is required")
			}
			return client.SendWithin(cmdCtx, client.SlowSendTimeout, eventType, map[string]any{"address": address})
		},
	}
}

func bluetoothCommand() *cli.Command {
	return &cli.Command{
		Name:  "bluetooth",
		Usage: "Connect, disconnect or forget paired devices, or turn Bluetooth on or off",
		Commands: []*cli.Command{
			bluetoothDeviceCommand("connect", "Connect a paired device", event.EventBluetoothConnect),
			bluetoothDeviceCommand("disconnect", "Disconnect a paired device", event.EventBluetoothDisconnect),
			bluetoothDeviceCommand("forget", "Forget (unpair) a device", event.EventBluetoothForget),
			{
				Name:      "power",
				Usage:     "Turn the Bluetooth adapter on or off",
				ArgsUsage: "<on|off>",
				Action: func(cmdCtx context.Context, cmd *cli.Command) error {
					var powered bool
					switch cmd.Args().First() {
					case "on":
						powered = true
					case "off":
						powered = false
					default:
						return fmt.Errorf("choose on or off")
					}
					return client.SendWithin(cmdCtx, client.SlowSendTimeout, event.EventBluetoothSetPower, map[string]any{"powered": powered})
				},
			},
		},
	}
}
