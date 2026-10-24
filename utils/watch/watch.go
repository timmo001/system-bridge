// Package watch helps modules update as soon as something changes on the
// system, rather than on their next refresh.
package watch

import (
	"context"
	"log/slog"
	"reflect"
	"sync"
	"time"
)

// Debounce returns a trigger that calls fn once delay has passed without
// another trigger, so the burst of events one change makes becomes a single
// update. stop cancels a pending call.
func Debounce(delay time.Duration, fn func()) (trigger func(), stop func()) {
	var mu sync.Mutex
	var timer *time.Timer
	trigger = func() {
		mu.Lock()
		defer mu.Unlock()
		if timer == nil {
			timer = time.AfterFunc(delay, fn)
		} else {
			timer.Reset(delay)
		}
	}
	stop = func() {
		mu.Lock()
		defer mu.Unlock()
		if timer != nil {
			timer.Stop()
		}
	}
	return trigger, stop
}

// Retry runs follow until ctx is done, waiting delay before running it again
// whenever it returns, such as when the source of its events restarts.
func Retry(ctx context.Context, delay time.Duration, name string, follow func(context.Context) error) {
	for {
		if err := follow(ctx); err != nil && ctx.Err() == nil {
			slog.Debug("Stopped following events", "source", name, "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(delay):
		}
	}
}

// Changes returns a check that calls changed whenever read returns something
// different from its last reading, for sources whose events don't all change
// what a module reports. Readings that fail are skipped.
func Changes[T any](read func() (T, error), changed func()) (check func()) {
	var mu sync.Mutex
	var last T
	var have bool
	return func() {
		mu.Lock()
		defer mu.Unlock()
		current, err := read()
		if err != nil {
			return
		}
		if have && !reflect.DeepEqual(current, last) {
			changed()
		}
		last, have = current, true
	}
}

// Poll calls changed whenever read returns something different from its last
// reading, checking every interval until ctx is done. It's for sources that
// can't report their changes, so read must be cheap.
func Poll[T any](ctx context.Context, interval time.Duration, read func() (T, error), changed func()) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	check := Changes(read, changed)
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		check()
	}
}
