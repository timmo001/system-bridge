//go:build linux

package bluetooth

import (
	"context"
	"fmt"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/types"
)

const (
	bluez         = "org.bluez"
	bluezAdapter1 = bluez + ".Adapter1"
	bluezDevice1  = bluez + ".Device1"
)

type managedObjects = map[dbus.ObjectPath]map[string]map[string]dbus.Variant

// GetBluetoothData lists the paired devices that BlueZ knows about, and
// whether its adapters are on
func GetBluetoothData(ctx context.Context) (types.BluetoothData, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return types.BluetoothData{}, fmt.Errorf("failed to connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	objects, err := getManagedObjects(ctx, conn)
	if err != nil {
		return types.BluetoothData{}, err
	}

	data := types.BluetoothData{Devices: make([]types.BluetoothDevice, 0)}
	for _, interfaces := range objects {
		if properties, ok := interfaces[bluezAdapter1]; ok {
			// Any adapter being on counts as on
			powered := boolProperty(properties, "Powered") || (data.Powered != nil && *data.Powered)
			data.Powered = &powered
		}
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
		data.Devices = append(data.Devices, device)
	}
	sortDevices(data.Devices)
	return data, nil
}

func getManagedObjects(ctx context.Context, conn *dbus.Conn) (managedObjects, error) {
	var objects managedObjects
	if err := conn.Object(bluez, "/").
		CallWithContext(ctx, "org.freedesktop.DBus.ObjectManager.GetManagedObjects", 0).
		Store(&objects); err != nil {
		return nil, fmt.Errorf("failed to read BlueZ devices: %w", err)
	}
	return objects, nil
}

func stringProperty(properties map[string]dbus.Variant, name string) string {
	value, _ := properties[name].Value().(string)
	return value
}

func boolProperty(properties map[string]dbus.Variant, name string) bool {
	value, _ := properties[name].Value().(bool)
	return value
}
