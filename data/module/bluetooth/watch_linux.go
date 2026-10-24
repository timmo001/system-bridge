//go:build linux

package bluetooth

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the property changes that connecting a device makes
// into a single update.
const watchDebounce = 250 * time.Millisecond

// watchRetry is how long to wait before following BlueZ again after the
// system bus connection fails.
const watchRetry = 30 * time.Second

// watchedProperties are the device properties the module reports. Others,
// such as the signal strength while scanning, change too often to follow.
var watchedProperties = []string{"Address", "Alias", "Connected", "Icon", "Paired"}

// Watch calls changed whenever a device is paired, removed, connected,
// disconnected or renamed, until ctx is done. It follows BlueZ's signals.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	watch.Retry(ctx, watchRetry, "bluez", func(ctx context.Context) error {
		return followBlueZ(ctx, trigger)
	})
}

func followBlueZ(ctx context.Context, trigger func()) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	for _, options := range [][]dbus.MatchOption{
		{dbus.WithMatchSender(bluez), dbus.WithMatchInterface("org.freedesktop.DBus.Properties"), dbus.WithMatchMember("PropertiesChanged")},
		{dbus.WithMatchSender(bluez), dbus.WithMatchInterface("org.freedesktop.DBus.ObjectManager")},
		{dbus.WithMatchInterface("org.freedesktop.DBus"), dbus.WithMatchMember("NameOwnerChanged"), dbus.WithMatchArg(0, bluez)},
	} {
		if err := conn.AddMatchSignal(options...); err != nil {
			return err
		}
	}
	signals := make(chan *dbus.Signal, 32)
	conn.Signal(signals)
	defer conn.RemoveSignal(signals)

	for {
		select {
		case <-ctx.Done():
			return nil
		case signal, ok := <-signals:
			if !ok {
				return errors.New("the system bus connection closed")
			}
			if relevantSignal(signal) {
				trigger()
			}
		}
	}
}

// relevantSignal reports whether a BlueZ signal changes what the module
// reports: a device's watched properties, a device being added or removed, or
// BlueZ starting or stopping.
func relevantSignal(signal *dbus.Signal) bool {
	switch signal.Name {
	case "org.freedesktop.DBus.NameOwnerChanged":
		return true
	case "org.freedesktop.DBus.Properties.PropertiesChanged":
		if len(signal.Body) < 2 {
			return false
		}
		if iface, _ := signal.Body[0].(string); iface != bluezDevice1 {
			return false
		}
		properties, _ := signal.Body[1].(map[string]dbus.Variant)
		for name := range properties {
			if slices.Contains(watchedProperties, name) {
				return true
			}
		}
	case "org.freedesktop.DBus.ObjectManager.InterfacesAdded":
		if len(signal.Body) < 2 {
			return false
		}
		interfaces, _ := signal.Body[1].(map[string]map[string]dbus.Variant)
		_, ok := interfaces[bluezDevice1]
		return ok
	case "org.freedesktop.DBus.ObjectManager.InterfacesRemoved":
		if len(signal.Body) < 2 {
			return false
		}
		interfaces, _ := signal.Body[1].([]string)
		return slices.Contains(interfaces, bluezDevice1)
	}
	return false
}
