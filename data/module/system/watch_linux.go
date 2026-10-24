//go:build linux

package system

import (
	"context"
	"errors"
	"slices"
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

// Watch calls changed whenever the session is locked or unlocked, or the user
// goes away or comes back, until ctx is done. Lock and idle hints come from
// logind, and input from the Wayland compositor where it supports
// ext-idle-notify.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	waylandIdle.setAwayChanged(trigger)
	defer waylandIdle.setAwayChanged(nil)

	watch.Retry(ctx, watchRetry, "logind", func(ctx context.Context) error {
		return followLogind(ctx, trigger)
	})
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
