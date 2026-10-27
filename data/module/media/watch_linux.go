//go:build linux

package media

import (
	"context"
	"errors"
	"time"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the property changes a track change makes into a
// single update.
const watchDebounce = 300 * time.Millisecond

// watchRetry is how long to wait before following the session bus again
// after its connection fails.
const watchRetry = 30 * time.Second

// Watch calls changed whenever a player opens or closes, or its track,
// playback state, volume or abilities change, until ctx is done. It follows
// MPRIS's signals on the session bus.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	watch.Retry(ctx, watchRetry, "mpris", func(ctx context.Context) error {
		return followPlayers(ctx, trigger)
	})
}

func followPlayers(ctx context.Context, trigger func()) error {
	conn, err := dbus.ConnectSessionBus()
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	for _, options := range [][]dbus.MatchOption{
		{dbus.WithMatchObjectPath(mprisPath), dbus.WithMatchInterface("org.freedesktop.DBus.Properties"), dbus.WithMatchMember("PropertiesChanged"), dbus.WithMatchArg(0, mprisInterface)},
		{dbus.WithMatchInterface("org.freedesktop.DBus"), dbus.WithMatchMember("NameOwnerChanged"), dbus.WithMatchArg0Namespace("org.mpris.MediaPlayer2")},
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
		case _, ok := <-signals:
			if !ok {
				return errors.New("the session bus connection closed")
			}
			trigger()
		}
	}
}
