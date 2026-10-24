//go:build linux

package bluetooth

import (
	"context"
	"fmt"
	"strings"

	"github.com/godbus/dbus/v5"
)

// Connect connects a paired device, and waits until it's connected
func Connect(ctx context.Context, address string) error {
	return callDevice(ctx, address, "Connect")
}

// Disconnect disconnects a paired device
func Disconnect(ctx context.Context, address string) error {
	return callDevice(ctx, address, "Disconnect")
}

// Forget unpairs a device, so it has to be paired again to connect
func Forget(ctx context.Context, address string) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return fmt.Errorf("failed to connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	path, properties, err := findDevice(ctx, conn, address)
	if err != nil {
		return err
	}
	adapter, _ := properties["Adapter"].Value().(dbus.ObjectPath)
	if adapter == "" {
		return fmt.Errorf("failed to find the adapter %s is paired with", address)
	}
	if err := conn.Object(bluez, adapter).CallWithContext(ctx, bluezAdapter1+".RemoveDevice", 0, path).Err; err != nil {
		return fmt.Errorf("failed to forget %s: %w", address, err)
	}
	return nil
}

// SetPowered turns every adapter on or off
func SetPowered(ctx context.Context, powered bool) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return fmt.Errorf("failed to connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	objects, err := getManagedObjects(ctx, conn)
	if err != nil {
		return err
	}
	found := false
	for path, interfaces := range objects {
		if _, ok := interfaces[bluezAdapter1]; !ok {
			continue
		}
		found = true
		if err := conn.Object(bluez, path).CallWithContext(ctx, "org.freedesktop.DBus.Properties.Set", 0,
			bluezAdapter1, "Powered", dbus.MakeVariant(powered)).Err; err != nil {
			return fmt.Errorf("failed to turn %s %s: %w", path, onOff(powered), err)
		}
	}
	if !found {
		return fmt.Errorf("%w: there's no Bluetooth adapter", ErrUnsupported)
	}
	return nil
}

func callDevice(ctx context.Context, address string, method string) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return fmt.Errorf("failed to connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	path, _, err := findDevice(ctx, conn, address)
	if err != nil {
		return err
	}
	if err := conn.Object(bluez, path).CallWithContext(ctx, bluezDevice1+"."+method, 0).Err; err != nil {
		return fmt.Errorf("failed to %s %s: %w", strings.ToLower(method), address, err)
	}
	return nil
}

// findDevice finds the paired device with an address, in any letter case
func findDevice(ctx context.Context, conn *dbus.Conn, address string) (dbus.ObjectPath, map[string]dbus.Variant, error) {
	objects, err := getManagedObjects(ctx, conn)
	if err != nil {
		return "", nil, err
	}
	for path, interfaces := range objects {
		properties, ok := interfaces[bluezDevice1]
		if ok && boolProperty(properties, "Paired") && strings.EqualFold(stringProperty(properties, "Address"), address) {
			return path, properties, nil
		}
	}
	return "", nil, fmt.Errorf("%w: %s", ErrNotFound, address)
}

func onOff(on bool) string {
	if on {
		return "on"
	}
	return "off"
}
