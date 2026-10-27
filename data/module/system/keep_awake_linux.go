//go:build linux

package system

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/godbus/dbus/v5"
)

// omarchyIdleToggle is Omarchy's stay awake switch, the one its bar shows. On
// Omarchy, keeping awake goes through it so the bar agrees.
const omarchyIdleToggle = "omarchy-toggle-idle"

const keepAwakeTimeout = 5 * time.Second

var keepAwake = &keepAwakeState{}

type keepAwakeState struct {
	mu sync.Mutex
	// inhibitor holds logind's idle inhibitor open, where Omarchy's switch
	// isn't there; closing it lets the system idle again
	inhibitor *os.File
	timer     *time.Timer
	until     *int64
	// changed is told when a duration runs out
	changed func()
}

// setChanged sets the function told when keeping awake ends by itself
func (s *keepAwakeState) setChanged(fn func()) {
	s.mu.Lock()
	s.changed = fn
	s.mu.Unlock()
}

// GetKeepAwake reports whether the system is being kept awake, and when that
// ends, in Unix seconds, if it was set to end
func GetKeepAwake(ctx context.Context) (*bool, *int64) {
	keepAwake.mu.Lock()
	defer keepAwake.mu.Unlock()

	if path, err := exec.LookPath(omarchyIdleToggle); err == nil {
		enabled, err := omarchyStayAwake(ctx, path)
		if err != nil {
			slog.Debug("Failed to read Omarchy's stay awake switch", "error", err)
			return nil, nil
		}
		if !enabled {
			return &enabled, nil
		}
		return &enabled, keepAwake.until
	}

	enabled := keepAwake.inhibitor != nil
	return &enabled, keepAwake.until
}

// SetKeepAwake keeps the system from idling, or lets it idle again. A
// duration above 0 lets it idle again after that long.
func SetKeepAwake(ctx context.Context, enabled bool, duration time.Duration) error {
	keepAwake.mu.Lock()
	defer keepAwake.mu.Unlock()

	if keepAwake.timer != nil {
		keepAwake.timer.Stop()
		keepAwake.timer = nil
	}
	keepAwake.until = nil

	if err := keepAwake.apply(ctx, enabled); err != nil {
		return err
	}

	if enabled && duration > 0 {
		until := time.Now().Add(duration).Unix()
		keepAwake.until = &until
		keepAwake.timer = time.AfterFunc(duration, keepAwake.expire)
	}
	return nil
}

// expire lets the system idle again once a duration runs out
func (s *keepAwakeState) expire() {
	s.mu.Lock()
	s.timer = nil
	s.until = nil
	ctx, cancel := context.WithTimeout(context.Background(), keepAwakeTimeout)
	err := s.apply(ctx, false)
	cancel()
	changed := s.changed
	s.mu.Unlock()

	if err != nil {
		slog.Warn("Failed to stop keeping the system awake", "error", err)
	}
	if changed != nil {
		changed()
	}
}

// apply turns keeping awake on or off. The caller holds s.mu.
func (s *keepAwakeState) apply(ctx context.Context, enabled bool) error {
	if path, err := exec.LookPath(omarchyIdleToggle); err == nil {
		mode := "allow-idle"
		if enabled {
			mode = "stay-awake"
		}
		ctx, cancel := context.WithTimeout(ctx, keepAwakeTimeout)
		defer cancel()
		if out, err := exec.CommandContext(ctx, path, mode).CombinedOutput(); err != nil {
			return fmt.Errorf("%s %s: %w: %s", omarchyIdleToggle, mode, err, out)
		}
		return nil
	}

	if !enabled {
		if s.inhibitor != nil {
			err := s.inhibitor.Close()
			s.inhibitor = nil
			if err != nil {
				return fmt.Errorf("release the idle inhibitor: %w", err)
			}
		}
		return nil
	}
	if s.inhibitor != nil {
		return nil
	}

	inhibitor, err := inhibitIdle(ctx)
	if err != nil {
		return err
	}
	s.inhibitor = inhibitor
	return nil
}

// inhibitIdle takes a logind idle inhibitor, which lasts until the file it
// returns is closed
func inhibitIdle(ctx context.Context) (*os.File, error) {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		return nil, fmt.Errorf("connect to the system bus: %w", err)
	}
	defer func() { _ = conn.Close() }()

	ctx, cancel := context.WithTimeout(ctx, keepAwakeTimeout)
	defer cancel()

	var fd dbus.UnixFD
	if err := conn.Object("org.freedesktop.login1", "/org/freedesktop/login1").
		CallWithContext(ctx, "org.freedesktop.login1.Manager.Inhibit", 0,
			"idle", "System Bridge", "Kept awake from System Bridge", "block").
		Store(&fd); err != nil {
		return nil, fmt.Errorf("take an idle inhibitor from logind: %w", err)
	}
	return os.NewFile(uintptr(fd), "system-bridge-idle-inhibitor"), nil
}

// omarchyStayAwake reads Omarchy's stay awake switch
func omarchyStayAwake(ctx context.Context, path string) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, keepAwakeTimeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, path, "status").Output()
	if err != nil {
		return false, err
	}
	var status struct {
		Enabled *bool `json:"enabled"`
	}
	if err := json.Unmarshal(out, &status); err != nil {
		return false, err
	}
	if status.Enabled == nil {
		return false, errors.New("its status has no enabled field")
	}
	return *status.Enabled, nil
}
