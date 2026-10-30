//go:build linux

package system

import (
	"context"
	"errors"
	"slices"
	"sync"
	"time"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups a lock and an idle change that happen together, such
// as locking after a period away, into a single update.
const watchDebounce = 250 * time.Millisecond

// watchRetry is how long to wait before following logind again, such as
// when there's no login session yet.
const watchRetry = time.Minute

// Watch calls changed whenever the session is locked or unlocked, the user
// goes away or comes back, the power profile changes, keeping awake runs
// out, a systemd unit fails or recovers, or an app starts or stops using a
// camera, until ctx is done. Lock and idle hints come from logind, input
// from the Wayland compositor where it supports ext-idle-notify, unit
// states from the system and user systemd managers, and camera use from
// inotify on the video devices.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	waylandIdle.setAwayChanged(trigger)
	defer waylandIdle.setAwayChanged(nil)
	keepAwake.setChanged(trigger)
	defer keepAwake.setChanged(nil)

	var wg sync.WaitGroup
	for _, scope := range unitScopes {
		wg.Go(func() {
			watch.Retry(ctx, watchRetry, scope.name+" units", func(ctx context.Context) error {
				return followUnits(ctx, scope, trigger)
			})
		})
	}
	wg.Go(func() {
		watch.Retry(ctx, watchRetry, "power profiles", func(ctx context.Context) error {
			return followPowerProfiles(ctx, trigger)
		})
	})
	wg.Go(func() {
		watch.Retry(ctx, watchRetry, "cameras", func(ctx context.Context) error {
			return followCameras(ctx, trigger)
		})
	})
	watch.Retry(ctx, watchRetry, "logind", func(ctx context.Context) error {
		return followLogind(ctx, trigger)
	})
	wg.Wait()
}

// followPowerProfiles triggers when the active power profile changes, such as
// from the desktop's own power menu
func followPowerProfiles(ctx context.Context, trigger func()) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	for _, service := range powerProfilesServices {
		if err := conn.AddMatchSignal(
			dbus.WithMatchObjectPath(service.path),
			dbus.WithMatchInterface("org.freedesktop.DBus.Properties"),
			dbus.WithMatchMember("PropertiesChanged"),
			dbus.WithMatchArg(0, service.name),
		); err != nil {
			return err
		}
	}
	signals := make(chan *dbus.Signal, 16)
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
			if len(signal.Body) < 2 {
				continue
			}
			properties, _ := signal.Body[1].(map[string]dbus.Variant)
			if _, ok := properties["ActiveProfile"]; ok {
				trigger()
			}
		}
	}
}

// followUnits triggers when a unit fails, or a failed unit starts again or is
// reset, without updating for every other unit that starts or stops.
func followUnits(ctx context.Context, scope unitScope, trigger func()) error {
	conn, err := scope.connect()
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	for _, options := range [][]dbus.MatchOption{
		{dbus.WithMatchSender(systemd1), dbus.WithMatchInterface("org.freedesktop.DBus.Properties"), dbus.WithMatchMember("PropertiesChanged"), dbus.WithMatchArg(0, systemd1+".Unit")},
		{dbus.WithMatchSender(systemd1), dbus.WithMatchInterface(systemd1 + ".Manager"), dbus.WithMatchMember("UnitRemoved")},
	} {
		if err := conn.AddMatchSignal(options...); err != nil {
			return err
		}
	}
	signals := make(chan *dbus.Signal, 64)
	conn.Signal(signals)
	defer conn.RemoveSignal(signals)

	// systemd only sends unit signals to clients that subscribe
	if err := conn.Object(systemd1, "/org/freedesktop/systemd1").Call(systemd1+".Manager.Subscribe", 0).Err; err != nil {
		return err
	}
	units, err := listFailedUnits(conn)
	if err != nil {
		return err
	}
	failed := make(map[dbus.ObjectPath]bool, len(units))
	for _, unit := range units {
		failed[unit.Path] = true
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case signal, ok := <-signals:
			if !ok {
				return errors.New("the " + scope.name + " bus connection closed")
			}
			if failedUnitsChanged(signal, failed) {
				trigger()
			}
		}
	}
}

// failedUnitsChanged reports whether a unit signal changes which units have
// failed, keeping failed up to date
func failedUnitsChanged(signal *dbus.Signal, failed map[dbus.ObjectPath]bool) bool {
	switch signal.Name {
	case "org.freedesktop.DBus.Properties.PropertiesChanged":
		if len(signal.Body) < 2 {
			return false
		}
		properties, _ := signal.Body[1].(map[string]dbus.Variant)
		variant, ok := properties["ActiveState"]
		if !ok {
			return false
		}
		state, _ := variant.Value().(string)
		isFailed := state == "failed"
		if isFailed == failed[signal.Path] {
			return false
		}
		if isFailed {
			failed[signal.Path] = true
		} else {
			delete(failed, signal.Path)
		}
		return true
	case systemd1 + ".Manager.UnitRemoved":
		if len(signal.Body) < 2 {
			return false
		}
		path, _ := signal.Body[1].(dbus.ObjectPath)
		if !failed[path] {
			return false
		}
		delete(failed, path)
		return true
	}
	return false
}

func followLogind(ctx context.Context, trigger func()) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	path, err := userSession(conn)
	if err != nil {
		return err
	}
	if err := conn.AddMatchSignal(
		dbus.WithMatchObjectPath(path),
		dbus.WithMatchInterface("org.freedesktop.DBus.Properties"),
		dbus.WithMatchMember("PropertiesChanged"),
	); err != nil {
		return err
	}
	signals := make(chan *dbus.Signal, 16)
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
			if lockOrIdleChanged(signal) {
				trigger()
			}
		}
	}
}

// lockOrIdleChanged reports whether a session's PropertiesChanged signal,
// whose body is the interface, the changed properties and the invalidated
// ones, includes the lock or idle hint.
func lockOrIdleChanged(signal *dbus.Signal) bool {
	if len(signal.Body) < 3 {
		return false
	}
	hints := []string{"IdleHint", "LockedHint"}
	if properties, ok := signal.Body[1].(map[string]dbus.Variant); ok {
		for name := range properties {
			if slices.Contains(hints, name) {
				return true
			}
		}
	}
	if invalidated, ok := signal.Body[2].([]string); ok {
		for _, name := range invalidated {
			if slices.Contains(hints, name) {
				return true
			}
		}
	}
	return false
}
