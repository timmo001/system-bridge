//go:build linux

package bluetooth

import (
	"context"
	"fmt"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/types"
)

const (
	bluez        = "org.bluez"
	bluezDevice1 = bluez + ".Device1"
)

// GetBluetoothData lists the paired devices that BlueZ knows about
func GetBluetoothData(ctx context.Context) (types.BluetoothData, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return types.BluetoothData{}, fmt.Errorf("failed to connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	var objects map[dbus.ObjectPath]map[string]map[string]dbus.Variant
	if err := conn.Object(bluez, "/").
		CallWithContext(ctx, "org.freedesktop.DBus.ObjectManager.GetManagedObjects", 0).
		Store(&objects); err != nil {
		return types.BluetoothData{}, fmt.Errorf("failed to read BlueZ devices: %w", err)
	}

	devices := make([]types.BluetoothDevice, 0)
	for _, interfaces := range objects {
		properties, ok := interfaces[bluezDevice1]
		if !ok || !boolProperty(properties, "Paired") {
			continue
		}
		device := types.BluetoothDevice{
			Address:   stringProperty(properties, "Address"),
			Name:      stringProperty(properties, "Alias"),
			Connected: boolProperty(properties, "Connected"),
		}
		if device.Name == "" {
			device.Name = device.Address
		}
		if icon := stringProperty(properties, "Icon"); icon != "" {
			device.Type = &icon
		}
		devices = append(devices, device)
	}
	sortDevices(devices)
	return types.BluetoothData{Devices: devices}, nil
}

func stringProperty(properties map[string]dbus.Variant, name string) string {
	value, _ := properties[name].Value().(string)
	return value
}

func boolProperty(properties map[string]dbus.Variant, name string) bool {
	value, _ := properties[name].Value().(bool)
	return value
}
