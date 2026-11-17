// Package input sends keyboard and pointer input to the desktop, through the
// best backend this session has.
package input

import (
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/go-vgo/robotgo"
	"github.com/timmo001/system-bridge/types"
)

// Backend sends input to the desktop.
type Backend interface {
	Name() string
	KeyTap(key string, modifiers ...any) error
	TypeStr(text string) error
	MoveRelative(dx, dy int) error
	// Click clicks a button by robotgo's name for it: left, right or center.
	Click(button string, double bool) error
	Toggle(button string, down bool) error
	// Scroll scrolls by wheel notches. Positive y scrolls up, positive x left.
	Scroll(x, y int) error
	Close()
}

// Status says which backend sends input, or why none can.
type Status = types.InputStatus

// ErrUnavailable is returned when no backend can send input.
var ErrUnavailable = errors.New("input isn't available")

var (
	mu       sync.Mutex
	selected Backend
	status   Status
)

// current returns the backend in use, choosing it on first use.
func current() (Backend, error) {
	mu.Lock()
	defer mu.Unlock()

	if selected == nil {
		choose()
	}
	if selected == nil {
		return nil, fmt.Errorf("%w: %s", ErrUnavailable, *status.Reason)
	}
	return selected, nil
}

// CurrentStatus returns which backend sends input. When none could, it tries
// again, so a desktop that has since started is found.
func CurrentStatus() Status {
	mu.Lock()
	defer mu.Unlock()

	if selected == nil {
		choose()
	}
	return status
}

// Use sends input with the backend in use. When that backend has lost its
// connection, as when the compositor restarts, it chooses again and sends once
// more.
func Use(send func(Backend) error) error {
	backend, err := current()
	if err != nil {
		return err
	}
	err = send(backend)
	if !lostConnection(err) {
		return err
	}
	slog.Warn("Input backend lost its connection, choosing again", "backend", backend.Name(), "error", err)
	drop(backend)
	if backend, err = current(); err != nil {
		return err
	}
	return send(backend)
}

// Close closes the backend in use, if any.
func Close() {
	mu.Lock()
	defer mu.Unlock()

	if selected != nil {
		selected.Close()
		selected = nil
		status = Status{}
	}
}

// drop closes backend if it's still the one in use, so another request that
// has already chosen again keeps its choice.
func drop(backend Backend) {
	mu.Lock()
	defer mu.Unlock()

	if selected == backend {
		selected.Close()
		selected = nil
		status = Status{}
	}
}

func choose() {
	backend, reason := selectBackend()
	if backend == nil {
		status = Status{Reason: &reason}
		slog.Warn("No input backend available", "reason", reason)
		return
	}
	name := backend.Name()
	selected = backend
	status = Status{Available: true, Backend: &name}
	slog.Info("Selected input backend", "backend", name)
}

// robotgoBackend uses robotgo's default backend: X11 on Linux, and the
// native APIs on Windows and macOS.
type robotgoBackend struct{ name string }

func (b robotgoBackend) Name() string { return b.name }

func (robotgoBackend) KeyTap(key string, modifiers ...any) error {
	return robotgo.KeyTap(key, modifiers...)
}

func (robotgoBackend) TypeStr(text string) error { return robotgo.TypeStr(text) }

func (robotgoBackend) MoveRelative(dx, dy int) error { return robotgo.MoveRelative(dx, dy) }

func (robotgoBackend) Click(button string, double bool) error {
	return robotgo.Click(button, double)
}

func (robotgoBackend) Toggle(button string, down bool) error {
	return robotgo.Toggle(button, direction(down))
}

func (robotgoBackend) Scroll(x, y int) error { return robotgo.Scroll(x, y) }

func (robotgoBackend) Close() {}

func direction(down bool) string {
	if down {
		return "down"
	}
	return "up"
}
