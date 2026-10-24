//go:build linux

package system

import (
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/godbus/dbus/v5"
)

const login1 = "org.freedesktop.login1"

// GetIdleState returns the seconds since the user's last input and whether
// their session is locked. Idle time comes from the Wayland compositor where it
// supports ext-idle-notify, since desktops such as Hyprland never set logind's
// idle hint. Otherwise it comes from logind, as does the lock state.
func GetIdleState() (*uint64, *bool) {
	session := readLogindSession()

	if idle, ok := waylandIdle.idleTime(); ok {
		return &idle, session.locked
	}
	return session.idleTime, session.locked
}

type logindSession struct {
	idleTime *uint64
	locked   *bool
}

func readLogindSession() logindSession {
	conn, err := dbus.ConnectSystemBus()
	if err != nil {
		slog.Debug("Failed to connect to the system bus", "error", err)
		return logindSession{}
	}
	defer func() {
		if err := conn.Close(); err != nil {
			slog.Debug("Failed to close the system bus", "error", err)
		}
	}()

	path, err := userSession(conn)
	if err != nil {
		slog.Debug("No login session for idle and lock state", "error", err)
		return logindSession{}
	}
	object := conn.Object(login1, path)

	var session logindSession
	if variant, err := object.GetProperty(login1 + ".Session.LockedHint"); err == nil {
		if locked, ok := variant.Value().(bool); ok {
			session.locked = &locked
		}
	}

	idleHint, errHint := object.GetProperty(login1 + ".Session.IdleHint")
	idleSince, errSince := object.GetProperty(login1 + ".Session.IdleSinceHint")
	if errHint != nil || errSince != nil {
		return session
	}
	idle, _ := idleHint.Value().(bool)
	sinceMicros, _ := idleSince.Value().(uint64)
	var seconds uint64
	if idle && sinceMicros > 0 {
		if elapsed := time.Since(time.UnixMicro(int64(sinceMicros))); elapsed > 0 {
			seconds = uint64(elapsed.Seconds())
		}
	}
	session.idleTime = &seconds
	return session
}

// userSession is the caller's own session, or the user's graphical session
// when the backend runs as a user service outside one
func userSession(conn *dbus.Conn) (dbus.ObjectPath, error) {
	var path dbus.ObjectPath
	if err := conn.Object(login1, "/org/freedesktop/login1").
		Call(login1+".Manager.GetSessionByPID", 0, uint32(os.Getpid())).Store(&path); err == nil {
		return path, nil
	}

	variant, err := conn.Object(login1, "/org/freedesktop/login1/user/self").
		GetProperty(login1 + ".User.Display")
	if err != nil {
		return "", fmt.Errorf("failed to find a login session: %v", err)
	}
	// A (session ID, object path) pair
	if display, ok := variant.Value().([]any); ok && len(display) == 2 {
		if path, ok := display[1].(dbus.ObjectPath); ok && path != "/" {
			return path, nil
		}
	}
	return "", fmt.Errorf("failed to find a login session")
}
