//go:build linux

// Package wayland is a minimal Wayland client: enough of the wire format to
// bind globals, send requests and read events, without cgo or libwayland.
package wayland

import (
	"bufio"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"os"
	"path/filepath"
	"time"
)

// The objects every connection starts with
const (
	DisplayID      = 1
	RegistryID     = 2
	SyncCallbackID = 3

	// FirstFreeID is the first ID free for a client's own objects
	FirstFreeID = 4
)

// Global is an interface the compositor offers
type Global struct {
	Name    uint32
	Version uint32
}

// Conn is a connection to the compositor, with the globals it announced
type Conn struct {
	net.Conn
	Reader  *bufio.Reader
	Globals map[string]Global // The first of each interface
	Outputs []Global          // Every wl_output
}

// Connect connects to the compositor and reads its globals
func Connect(timeout time.Duration) (*Conn, error) {
	socket, err := Socket()
	if err != nil {
		return nil, err
	}

	conn, err := net.DialTimeout("unix", socket, timeout)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %w", socket, err)
	}
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return nil, errors.Join(err, conn.Close())
	}
	c := &Conn{Conn: conn, Reader: bufio.NewReader(conn), Globals: map[string]Global{}}

	// wl_display.get_registry, then wl_display.sync to know when every global
	// has been announced
	if _, err := conn.Write(append(
		Message(DisplayID, 1, Uint(RegistryID)),
		Message(DisplayID, 0, Uint(SyncCallbackID))...,
	)); err != nil {
		return nil, errors.Join(err, conn.Close())
	}
	for done := false; !done; {
		object, opcode, body, err := ReadMessage(c.Reader)
		if err != nil {
			return nil, errors.Join(err, conn.Close())
		}
		switch {
		case object == RegistryID && opcode == 0:
			// wl_registry.global: name, interface, version
			global, iface, ok := ParseGlobal(body)
			if !ok {
				continue
			}
			if iface == "wl_output" {
				c.Outputs = append(c.Outputs, global)
			}
			if _, ok := c.Globals[iface]; !ok {
				c.Globals[iface] = global
			}
		case object == SyncCallbackID && opcode == 0:
			done = true
		case object == DisplayID && opcode == 0:
			return nil, errors.Join(errors.New("the compositor reported an error"), conn.Close())
		}
	}
	if err := conn.SetDeadline(time.Time{}); err != nil {
		return nil, errors.Join(err, conn.Close())
	}
	return c, nil
}

// Socket is the compositor's socket from WAYLAND_DISPLAY, or the first one in
// the runtime directory when the backend runs as a service started without it
func Socket() (string, error) {
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

// Message is a request to an object
func Message(object uint32, opcode uint16, args ...[]byte) []byte {
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

// Uint is a uint, object or new_id argument
func Uint(value uint32) []byte {
	return binary.LittleEndian.AppendUint32(nil, value)
}

// String is a string argument
func String(value string) []byte {
	length := len(value) + 1
	padded := (length + 3) &^ 3
	arg := binary.LittleEndian.AppendUint32(nil, uint32(length))
	arg = append(arg, value...)
	return append(arg, make([]byte, padded-len(value))...)
}

// Bind is the arguments of wl_registry.bind, whose untyped new_id is sent as
// the interface name, the version and the ID
func Bind(name uint32, iface string, version uint32, id uint32) [][]byte {
	return [][]byte{Uint(name), String(iface), Uint(version), Uint(id)}
}

// ReadMessage reads an event
func ReadMessage(reader io.Reader) (object uint32, opcode uint16, body []byte, err error) {
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

// ParseGlobal reads a wl_registry.global event
func ParseGlobal(body []byte) (Global, string, bool) {
	args := Args(body)
	name, ok := args.Uint()
	if !ok {
		return Global{}, "", false
	}
	iface, ok := args.String()
	if !ok || iface == "" {
		return Global{}, "", false
	}
	version, ok := args.Uint()
	if !ok {
		return Global{}, "", false
	}
	return Global{Name: name, Version: version}, iface, true
}

// Args reads an event's arguments in order
type Args []byte

// Uint reads a uint, object or new_id argument
func (a *Args) Uint() (uint32, bool) {
	if len(*a) < 4 {
		return 0, false
	}
	value := binary.LittleEndian.Uint32(*a)
	*a = (*a)[4:]
	return value, true
}

// String reads a string argument
func (a *Args) String() (string, bool) {
	data, ok := a.Array()
	if !ok {
		return "", false
	}
	if len(data) == 0 {
		return "", true
	}
	return string(data[:len(data)-1]), true
}

// Array reads an array argument
func (a *Args) Array() ([]byte, bool) {
	length, ok := a.Uint()
	if !ok {
		return nil, false
	}
	padded := (int(length) + 3) &^ 3
	if len(*a) < padded {
		return nil, false
	}
	data := (*a)[:length]
	*a = (*a)[padded:]
	return data, true
}
