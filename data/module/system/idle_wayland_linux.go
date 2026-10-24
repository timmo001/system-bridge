//go:build linux

package system

import (
	"bufio"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// A minimal Wayland client for the ext-idle-notify-v1 protocol, which tells us
// when the user stops and starts giving input. It asks for a notification
// after a second without input, so the idle time is accurate to that second.

const (
	waylandIdleTimeout = time.Second
	waylandRetry       = time.Minute

	waylandDisplayID      = 1
	waylandRegistryID     = 2
	waylandSyncCallbackID = 3
	waylandSeatID         = 4
	waylandNotifierID     = 5
	waylandNotificationID = 6
)

var waylandIdle = &waylandIdleMonitor{}

type waylandIdleMonitor struct {
	mu          sync.Mutex
	connected   bool
	idle        bool
	idleSince   time.Time
	lastAttempt time.Time
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

type waylandGlobal struct {
	name    uint32
	version uint32
}

// connect sets up the idle notification. The caller holds m.mu.
func (m *waylandIdleMonitor) connect() error {
	display, err := waylandSocket()
	if err != nil {
		return err
	}

	conn, err := net.DialTimeout("unix", display, 2*time.Second)
	if err != nil {
		return fmt.Errorf("failed to connect to %s: %w", display, err)
	}
	if err := conn.SetDeadline(time.Now().Add(2 * time.Second)); err != nil {
		return errors.Join(err, conn.Close())
	}
	reader := bufio.NewReader(conn)

	// wl_display.get_registry, then wl_display.sync to know when every global
	// has been announced
	if _, err := conn.Write(append(
		waylandMessage(waylandDisplayID, 1, waylandUint(waylandRegistryID)),
		waylandMessage(waylandDisplayID, 0, waylandUint(waylandSyncCallbackID))...,
	)); err != nil {
		return errors.Join(err, conn.Close())
	}

	var seat, notifier *waylandGlobal
	for done := false; !done; {
		object, opcode, body, err := readWaylandMessage(reader)
		if err != nil {
			return errors.Join(err, conn.Close())
		}
		switch {
		case object == waylandRegistryID && opcode == 0:
			// wl_registry.global: name, interface, version
			global, iface, ok := parseWaylandGlobal(body)
			if !ok {
				continue
			}
			switch iface {
			case "wl_seat":
				if seat == nil {
					seat = &global
				}
			case "ext_idle_notifier_v1":
				notifier = &global
			}
		case object == waylandSyncCallbackID && opcode == 0:
			done = true
		case object == waylandDisplayID && opcode == 0:
			return errors.Join(errors.New("the compositor reported an error"), conn.Close())
		}
	}
	if seat == nil || notifier == nil {
		return errors.Join(errors.New("the compositor doesn't support ext-idle-notify-v1"), conn.Close())
	}

	// Version 2 adds input idle notifications, which ignore idle inhibitors
	// such as a playing video
	notifierVersion := min(notifier.version, 2)
	notificationOpcode := uint16(1) // get_idle_notification
	if notifierVersion >= 2 {
		notificationOpcode = 2 // get_input_idle_notification
	}
	requests := waylandMessage(waylandRegistryID, 0, waylandBind(seat.name, "wl_seat", 1, waylandSeatID)...)
	requests = append(requests, waylandMessage(waylandRegistryID, 0,
		waylandBind(notifier.name, "ext_idle_notifier_v1", notifierVersion, waylandNotifierID)...)...)
	requests = append(requests, waylandMessage(waylandNotifierID, notificationOpcode,
		waylandUint(waylandNotificationID),
		waylandUint(uint32(waylandIdleTimeout.Milliseconds())),
		waylandUint(waylandSeatID),
	)...)
	if _, err := conn.Write(requests); err != nil {
		return errors.Join(err, conn.Close())
	}
	if err := conn.SetDeadline(time.Time{}); err != nil {
		return errors.Join(err, conn.Close())
	}

	m.connected = true
	m.idle = false
	go m.listen(conn, reader)
	return nil
}

// waylandSocket is the compositor's socket from WAYLAND_DISPLAY, or the first
// one in the runtime directory when the backend runs as a service started
// without it
func waylandSocket() (string, error) {
	display := os.Getenv("WAYLAND_DISPLAY")
	if filepath.IsAbs(display) {
		return display, nil
	}
	runtimeDir := os.Getenv("XDG_RUNTIME_DIR")
	if runtimeDir == "" {
		return "", errors.New("XDG_RUNTIME_DIR is not set")
	}
	if display != "" {
		return filepath.Join(runtimeDir, display), nil
	}

	sockets, err := filepath.Glob(filepath.Join(runtimeDir, "wayland-*"))
	if err != nil {
		return "", err
	}
	for _, socket := range sockets {
		if info, err := os.Stat(socket); err == nil && info.Mode().Type() == fs.ModeSocket {
			return socket, nil
		}
	}
	return "", errors.New("no Wayland compositor socket found")
}

func (m *waylandIdleMonitor) listen(conn net.Conn, reader *bufio.Reader) {
	defer func() {
		if err := conn.Close(); err != nil {
			slog.Debug("Failed to close the Wayland connection", "error", err)
		}
		m.mu.Lock()
		m.connected = false
		m.idle = false
		m.mu.Unlock()
	}()

	for {
		object, opcode, _, err := readWaylandMessage(reader)
		if err != nil {
			slog.Debug("Wayland connection closed", "error", err)
			return
		}
		switch {
		case object == waylandNotificationID && opcode == 0: // idled
			m.mu.Lock()
			m.idle = true
			m.idleSince = time.Now().Add(-waylandIdleTimeout)
			m.mu.Unlock()
		case object == waylandNotificationID && opcode == 1: // resumed
			m.mu.Lock()
			m.idle = false
			m.mu.Unlock()
		case object == waylandDisplayID && opcode == 0:
			slog.Debug("The compositor reported a Wayland protocol error")
			return
		}
	}
}

func waylandMessage(object uint32, opcode uint16, args ...[]byte) []byte {
	size := 8
	for _, arg := range args {
		size += len(arg)
	}
	message := binary.LittleEndian.AppendUint32(nil, object)
	message = binary.LittleEndian.AppendUint32(message, uint32(size)<<16|uint32(opcode))
	for _, arg := range args {
		message = append(message, arg...)
	}
	return message
}

func waylandUint(value uint32) []byte {
	return binary.LittleEndian.AppendUint32(nil, value)
}

func waylandString(value string) []byte {
	length := len(value) + 1
	padded := (length + 3) &^ 3
	arg := binary.LittleEndian.AppendUint32(nil, uint32(length))
	arg = append(arg, value...)
	return append(arg, make([]byte, padded-len(value))...)
}

// waylandBind is the arguments of wl_registry.bind, whose untyped new_id is
// sent as the interface name, the version and the ID
func waylandBind(name uint32, iface string, version uint32, id uint32) [][]byte {
	return [][]byte{waylandUint(name), waylandString(iface), waylandUint(version), waylandUint(id)}
}

func readWaylandMessage(reader io.Reader) (object uint32, opcode uint16, body []byte, err error) {
	header := make([]byte, 8)
	if _, err = io.ReadFull(reader, header); err != nil {
		return 0, 0, nil, err
	}
	object = binary.LittleEndian.Uint32(header)
	word := binary.LittleEndian.Uint32(header[4:])
	size := int(word >> 16)
	if size < 8 {
		return 0, 0, nil, fmt.Errorf("invalid Wayland message size %d", size)
	}
	body = make([]byte, size-8)
	if _, err = io.ReadFull(reader, body); err != nil {
		return 0, 0, nil, err
	}
	return object, uint16(word), body, nil
}

func parseWaylandGlobal(body []byte) (waylandGlobal, string, bool) {
	if len(body) < 12 {
		return waylandGlobal{}, "", false
	}
	name := binary.LittleEndian.Uint32(body)
	length := int(binary.LittleEndian.Uint32(body[4:]))
	padded := (length + 3) &^ 3
	if length == 0 || len(body) < 8+padded+4 {
		return waylandGlobal{}, "", false
	}
	iface := string(body[8 : 8+length-1])
	version := binary.LittleEndian.Uint32(body[8+padded:])
	return waylandGlobal{name: name, version: version}, iface, true
}
