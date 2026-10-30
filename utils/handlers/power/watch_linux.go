//go:build linux

package power

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/godbus/dbus/v5"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
)

const (
	login1Manager = "org.freedesktop.login1.Manager"
	// watchRetry is how long to wait before following logind again, such as
	// after the system bus restarts
	watchRetry = time.Minute
	// inhibitTimeout bounds the call that takes the delay lock
	inhibitTimeout = 5 * time.Second
)

// WatchSleep calls changed before the system sleeps or shuts down, and after
// it wakes, until ctx is done. A logind delay lock holds sleep and shutdown
// back until clients are told.
func WatchSleep(ctx context.Context, changed func(types.PowerState)) {
	watch.Retry(ctx, watchRetry, "logind sleep", func(ctx context.Context) error {
		return followSleep(ctx, changed)
	})
}

func followSleep(ctx context.Context, changed func(types.PowerState)) error {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()

	for _, member := range []string{"PrepareForSleep", "PrepareForShutdown"} {
		if err := conn.AddMatchSignal(
			dbus.WithMatchObjectPath("/org/freedesktop/login1"),
			dbus.WithMatchInterface(login1Manager),
			dbus.WithMatchMember(member),
		); err != nil {
			return err
		}
	}
	signals := make(chan *dbus.Signal, 4)
	conn.Signal(signals)
	defer conn.RemoveSignal(signals)

	lock := takeDelayLock(ctx, conn)
	defer func() { releaseDelayLock(lock) }()

	for {
		select {
		case <-ctx.Done():
			return nil
		case signal, ok := <-signals:
			if !ok {
				return errors.New("the system bus connection closed")
			}
			if len(signal.Body) < 1 {
				continue
			}
			starting, _ := signal.Body[0].(bool)
			switch signal.Name {
			case login1Manager + ".PrepareForSleep":
				if starting {
					notifyBefore(changed, types.PowerStateSleeping)
					releaseDelayLock(lock)
					lock = nil
					continue
				}
				lock = takeDelayLock(ctx, conn)
				changed(types.PowerStateResumed)
			case login1Manager + ".PrepareForShutdown":
				if starting {
					notifyBefore(changed, types.PowerStateShuttingDown)
					releaseDelayLock(lock)
					lock = nil
					continue
				}
				// The shutdown was cancelled
				if lock == nil {
					lock = takeDelayLock(ctx, conn)
				}
			}
		}
	}
}

// takeDelayLock takes a logind delay lock on sleep and shutdown, which lasts
// until the file it returns is closed. Without one, such as when polkit
// refuses it, clients are still told, just without the system waiting.
func takeDelayLock(ctx context.Context, conn *dbus.Conn) *os.File {
	ctx, cancel := context.WithTimeout(ctx, inhibitTimeout)
	defer cancel()

	var fd dbus.UnixFD
	if err := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1").
		CallWithContext(ctx, login1Manager+".Inhibit", 0,
			"sleep:shutdown", "System Bridge", "Telling clients the system is going to sleep or shutting down", "delay").
		Store(&fd); err != nil {
		slog.Debug("Failed to take a sleep delay lock from logind", "error", err)
		return nil
	}
	return os.NewFile(uintptr(fd), "system-bridge-sleep-inhibitor")
}

func releaseDelayLock(lock *os.File) {
	if lock == nil {
		return
	}
	if err := lock.Close(); err != nil {
		slog.Debug("Failed to release the sleep delay lock", "error", err)
	}
}
