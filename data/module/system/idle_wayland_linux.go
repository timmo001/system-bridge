//go:build linux

package system

import (
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/timmo001/system-bridge/utils/wayland"
)

// A minimal Wayland client for the ext-idle-notify-v1 protocol, which tells us
// when the user stops and starts giving input. It asks for a notification
// after a second without input, so the idle time is accurate to that second.

const (
	waylandIdleTimeout = time.Second
	waylandRetry       = time.Minute

	waylandSeatID         = wayland.FirstFreeID
	waylandNotifierID     = waylandSeatID + 1
	waylandNotificationID = waylandNotifierID + 1
)

var waylandIdle = &waylandIdleMonitor{}

type waylandIdleMonitor struct {
	mu          sync.Mutex
	connected   bool
	idle        bool
	idleSince   time.Time
	lastAttempt time.Time

	// away is whether the user has been idle for awayAfter, and awayChanged
	// is told whenever that flips
	away        bool
	awayTimer   *time.Timer
	awayChanged func()
}

// setAwayChanged sets the function told whenever the user goes away or comes
// back, connecting to the compositor if it isn't connected yet
func (m *waylandIdleMonitor) setAwayChanged(fn func()) {
	m.mu.Lock()
	m.awayChanged = fn
	m.mu.Unlock()
	if fn != nil {
		m.idleTime()
	}
}

// setAway records whether the user is away and, when that changed, returns
// the function to tell. The caller holds m.mu.
func (m *waylandIdleMonitor) setAway(away bool) func() {
	if m.awayTimer != nil {
		m.awayTimer.Stop()
		m.awayTimer = nil
	}
	if m.away == away {
		return nil
	}
	m.away = away
	return m.awayChanged
}

// idleTime returns the seconds since the last input, and false when the
// compositor can't tell us
func (m *waylandIdleMonitor) idleTime() (uint64, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.connected && time.Since(m.lastAttempt) >= waylandRetry {
		m.lastAttempt = time.Now()
		if err := m.connect(); err != nil {
			slog.Debug("Wayland idle notifications unavailable", "error", err)
		}
	}
	if !m.connected {
		return 0, false
	}
	if !m.idle {
		return 0, true
	}
	return uint64(time.Since(m.idleSince).Seconds()), true
}

// connect sets up the idle notification. The caller holds m.mu.
func (m *waylandIdleMonitor) connect() error {
	conn, err := wayland.Connect(2 * time.Second)
	if err != nil {
		return err
	}
	seat, hasSeat := conn.Globals["wl_seat"]
	notifier, hasNotifier := conn.Globals["ext_idle_notifier_v1"]
	if !hasSeat || !hasNotifier {
		return errors.Join(errors.New("the compositor doesn't support ext-idle-notify-v1"), conn.Close())
	}

	// Version 2 adds input idle notifications, which ignore idle inhibitors
	// such as a playing video
	notifierVersion := min(notifier.Version, 2)
	notificationOpcode := uint16(1) // get_idle_notification
	if notifierVersion >= 2 {
		notificationOpcode = 2 // get_input_idle_notification
	}
	requests := wayland.Message(wayland.RegistryID, 0, wayland.Bind(seat.Name, "wl_seat", 1, waylandSeatID)...)
	requests = append(requests, wayland.Message(wayland.RegistryID, 0,
		wayland.Bind(notifier.Name, "ext_idle_notifier_v1", notifierVersion, waylandNotifierID)...)...)
	requests = append(requests, wayland.Message(waylandNotifierID, notificationOpcode,
		wayland.Uint(waylandNotificationID),
		wayland.Uint(uint32(waylandIdleTimeout.Milliseconds())),
		wayland.Uint(waylandSeatID),
	)...)
	if _, err := conn.Write(requests); err != nil {
		return errors.Join(err, conn.Close())
	}

	m.connected = true
	m.idle = false
	go m.listen(conn)
	return nil
}

func (m *waylandIdleMonitor) listen(conn *wayland.Conn) {
	defer func() {
		if err := conn.Close(); err != nil {
			slog.Debug("Failed to close the Wayland connection", "error", err)
		}
		m.mu.Lock()
		m.connected = false
		m.idle = false
		notify := m.setAway(false)
		m.mu.Unlock()
		if notify != nil {
			notify()
		}
	}()

	for {
		object, opcode, _, err := wayland.ReadMessage(conn.Reader)
		if err != nil {
			slog.Debug("Wayland connection closed", "error", err)
			return
		}
		switch {
		case object == waylandNotificationID && opcode == 0: // idled
			m.mu.Lock()
			m.idle = true
			m.idleSince = time.Now().Add(-waylandIdleTimeout)
			m.setAway(false)
			var timer *time.Timer
			timer = time.AfterFunc(awayAfter-waylandIdleTimeout, func() {
				m.mu.Lock()
				if m.awayTimer != timer {
					// The user came back as it fired
					m.mu.Unlock()
					return
				}
				notify := m.setAway(true)
				m.mu.Unlock()
				if notify != nil {
					notify()
				}
			})
			m.awayTimer = timer
			m.mu.Unlock()
		case object == waylandNotificationID && opcode == 1: // resumed
			m.mu.Lock()
			m.idle = false
			notify := m.setAway(false)
			m.mu.Unlock()
			if notify != nil {
				notify()
			}
		case object == wayland.DisplayID && opcode == 0:
			slog.Debug("The compositor reported a Wayland protocol error")
			return
		}
	}
}
