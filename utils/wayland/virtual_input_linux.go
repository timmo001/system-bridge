package wayland

import (
	"encoding/binary"
	"errors"
	"fmt"
	"net"
	"os"
	"sync"
	"time"

	"golang.org/x/sys/unix"
)

// ErrClosed is returned once the connection to the compositor has gone
var ErrClosed = errors.New("the Wayland connection has closed")

// Pointer buttons, as Linux input event codes
const (
	ButtonLeft   uint32 = 0x110
	ButtonRight  uint32 = 0x111
	ButtonMiddle uint32 = 0x112
)

// Modifier is a modifier key: its key code and its mask in the keymap
type Modifier struct {
	Code uint32
	Mask uint32
}

// The modifiers of the keymap the virtual keyboard uses
var (
	Shift = Modifier{Code: 42, Mask: 1}
	Ctrl  = Modifier{Code: 29, Mask: 4}
	Alt   = Modifier{Code: 56, Mask: 8}
	Super = Modifier{Code: 125, Mask: 64}
)

// KeyPress is a key, by its Linux input event code, with the modifiers held
// while it's pressed
type KeyPress struct {
	Code      uint32
	Modifiers []Modifier
}

// keymap is a US keymap with every evdev key code, as `setxkbmap -print`
// gives, which the compositor compiles for the virtual keyboard
const keymap = `xkb_keymap {
	xkb_keycodes { include "evdev+aliases(qwerty)" };
	xkb_types { include "complete" };
	xkb_compat { include "complete" };
	xkb_symbols { include "pc+us+inet(evdev)" };
	xkb_geometry { include "pc(pc105)" };
};
`

// Object IDs of the virtual input's objects
const (
	seatID = FirstFreeID + iota
	pointerManagerID
	keyboardManagerID
	pointerID
	keyboardID
	setupSyncID
)

const (
	// zwlr_virtual_pointer_v1 requests
	pointerMotion       = 0
	pointerButton       = 2
	pointerFrame        = 4
	pointerAxisSource   = 5
	pointerAxisDiscrete = 7

	// zwp_virtual_keyboard_v1 requests
	keyboardKeymap    = 0
	keyboardKey       = 1
	keyboardModifiers = 2

	axisVertical    = 0
	axisHorizontal  = 1
	axisSourceWheel = 0

	// The distance one wheel notch scrolls, as libinput reports it
	notchDistance = 15

	writeTimeout = 5 * time.Second
)

// VirtualInput is a virtual pointer and keyboard on the compositor's seat,
// through the wlroots virtual pointer and virtual keyboard protocols, which
// Hyprland, Sway, river and other wlroots compositors offer
type VirtualInput struct {
	conn  *Conn
	start time.Time

	mu sync.Mutex

	done chan struct{}
	err  error // Why the connection closed, set before done is closed
}

// NewVirtualInput connects to the compositor and creates a virtual pointer
// and keyboard
func NewVirtualInput(timeout time.Duration) (*VirtualInput, error) {
	conn, err := Connect(timeout)
	if err != nil {
		return nil, err
	}
	input, err := setUp(conn, timeout)
	if err != nil {
		return nil, errors.Join(err, conn.Close())
	}
	return input, nil
}

func setUp(conn *Conn, timeout time.Duration) (*VirtualInput, error) {
	seat, ok := conn.Globals["wl_seat"]
	if !ok {
		return nil, errors.New("the compositor has no seat")
	}
	pointerManager, ok := conn.Globals["zwlr_virtual_pointer_manager_v1"]
	if !ok {
		return nil, errors.New("the compositor doesn't offer virtual pointers (zwlr_virtual_pointer_manager_v1)")
	}
	keyboardManager, ok := conn.Globals["zwp_virtual_keyboard_manager_v1"]
	if !ok {
		return nil, errors.New("the compositor doesn't offer virtual keyboards (zwp_virtual_keyboard_manager_v1)")
	}
	unixConn, ok := conn.Conn.(*net.UnixConn)
	if !ok {
		return nil, errors.New("the compositor connection isn't a Unix socket")
	}
	if err := conn.SetDeadline(time.Now().Add(timeout)); err != nil {
		return nil, err
	}

	var requests []byte
	requests = append(requests, Message(RegistryID, 0, Bind(seat.Name, "wl_seat", 1, seatID)...)...)
	requests = append(requests, Message(RegistryID, 0, Bind(pointerManager.Name, "zwlr_virtual_pointer_manager_v1", 1, pointerManagerID)...)...)
	requests = append(requests, Message(RegistryID, 0, Bind(keyboardManager.Name, "zwp_virtual_keyboard_manager_v1", 1, keyboardManagerID)...)...)
	// create_virtual_pointer and create_virtual_keyboard: seat, new_id
	requests = append(requests, Message(pointerManagerID, 0, Uint(seatID), Uint(pointerID))...)
	requests = append(requests, Message(keyboardManagerID, 0, Uint(seatID), Uint(keyboardID))...)
	if _, err := conn.Write(requests); err != nil {
		return nil, err
	}

	// The keymap's file descriptor goes alongside the request, not in it
	fd, size, err := keymapFile()
	if err != nil {
		return nil, err
	}
	defer func() { _ = fd.Close() }()
	keymapRequest := Message(keyboardID, keyboardKeymap, Uint(1), Uint(size)) // 1: xkb_v1
	if _, _, err := unixConn.WriteMsgUnix(keymapRequest, unix.UnixRights(int(fd.Fd())), nil); err != nil {
		return nil, fmt.Errorf("failed to send the keymap: %w", err)
	}

	// Sync, so a refusal arrives as an error now rather than on first use
	if _, err := conn.Write(Message(DisplayID, 0, Uint(setupSyncID))); err != nil {
		return nil, err
	}
	for {
		object, opcode, body, err := ReadMessage(conn.Reader)
		if err != nil {
			return nil, err
		}
		if object == DisplayID && opcode == 0 {
			return nil, displayError(body)
		}
		if object == setupSyncID && opcode == 0 {
			break
		}
	}
	if err := conn.SetDeadline(time.Time{}); err != nil {
		return nil, err
	}

	input := &VirtualInput{conn: conn, start: time.Now(), done: make(chan struct{})}
	go input.read()
	return input, nil
}

// keymapFile writes the keymap to a sealed memory file, as the protocol asks
func keymapFile() (*os.File, uint32, error) {
	data := append([]byte(keymap), 0)
	fd, err := unix.MemfdCreate("system-bridge-keymap", unix.MFD_CLOEXEC|unix.MFD_ALLOW_SEALING)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create the keymap file: %w", err)
	}
	file := os.NewFile(uintptr(fd), "system-bridge-keymap")
	if _, err := file.Write(data); err != nil {
		return nil, 0, errors.Join(fmt.Errorf("failed to write the keymap: %w", err), file.Close())
	}
	if _, err := unix.FcntlInt(file.Fd(), unix.F_ADD_SEALS,
		unix.F_SEAL_SHRINK|unix.F_SEAL_GROW|unix.F_SEAL_WRITE|unix.F_SEAL_SEAL); err != nil {
		return nil, 0, errors.Join(fmt.Errorf("failed to seal the keymap: %w", err), file.Close())
	}
	return file, uint32(len(data)), nil
}

// read reads events until the connection closes. Nothing the compositor sends
// is needed after set up, but it must be read so its buffer doesn't fill
func (v *VirtualInput) read() {
	for {
		object, opcode, body, err := ReadMessage(v.conn.Reader)
		if err == nil && object == DisplayID && opcode == 0 {
			err = displayError(body)
		}
		if err != nil {
			v.err = err
			close(v.done)
			return
		}
	}
}

// displayError reads a wl_display.error event
func displayError(body []byte) error {
	args := Args(body)
	object, _ := args.Uint()
	code, _ := args.Uint()
	message, _ := args.String()
	return fmt.Errorf("the compositor reported an error on object %d (code %d): %s", object, code, message)
}

// Close closes the connection, which removes the virtual pointer and keyboard
func (v *VirtualInput) Close() error {
	return v.conn.Close()
}

// Move moves the pointer by an amount
func (v *VirtualInput) Move(dx, dy int) error {
	return v.send(
		Message(pointerID, pointerMotion, Uint(v.now()), Fixed(dx), Fixed(dy)),
		Message(pointerID, pointerFrame),
	)
}

// Button presses or releases a button
func (v *VirtualInput) Button(button uint32, down bool) error {
	return v.send(v.button(button, down)...)
}

// Click clicks a button, twice for a double click
func (v *VirtualInput) Click(button uint32, double bool) error {
	messages := append(v.button(button, true), v.button(button, false)...)
	if double {
		messages = append(messages, messages...)
	}
	return v.send(messages...)
}

func (v *VirtualInput) button(button uint32, down bool) [][]byte {
	return [][]byte{
		Message(pointerID, pointerButton, Uint(v.now()), Uint(button), Uint(state(down))),
		Message(pointerID, pointerFrame),
	}
}

// Scroll scrolls by wheel notches. Positive values scroll right and down
func (v *VirtualInput) Scroll(horizontal, vertical int) error {
	now := v.now()
	messages := [][]byte{Message(pointerID, pointerAxisSource, Uint(axisSourceWheel))}
	for _, scroll := range []struct {
		axis    uint32
		notches int
	}{
		{axisHorizontal, horizontal},
		{axisVertical, vertical},
	} {
		if scroll.notches != 0 {
			messages = append(messages, Message(pointerID, pointerAxisDiscrete,
				Uint(now), Uint(scroll.axis), Fixed(scroll.notches*notchDistance), Int(scroll.notches)))
		}
	}
	return v.send(append(messages, Message(pointerID, pointerFrame))...)
}

// Press presses and releases each key in turn, holding its modifiers
func (v *VirtualInput) Press(keys ...KeyPress) error {
	var messages [][]byte
	for _, key := range keys {
		var mask uint32
		for _, modifier := range key.Modifiers {
			mask |= modifier.Mask
			messages = append(messages, v.key(modifier.Code, true), v.modifiers(mask))
		}
		messages = append(messages, v.key(key.Code, true), v.key(key.Code, false))
		for i := len(key.Modifiers) - 1; i >= 0; i-- {
			mask &^= key.Modifiers[i].Mask
			messages = append(messages, v.key(key.Modifiers[i].Code, false), v.modifiers(mask))
		}
	}
	return v.send(messages...)
}

func (v *VirtualInput) key(code uint32, down bool) []byte {
	return Message(keyboardID, keyboardKey, Uint(v.now()), Uint(code), Uint(state(down)))
}

// modifiers sets the modifiers held: depressed, latched, locked and group
func (v *VirtualInput) modifiers(mask uint32) []byte {
	return Message(keyboardID, keyboardModifiers, Uint(mask), Uint(0), Uint(0), Uint(0))
}

func (v *VirtualInput) send(messages ...[]byte) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	select {
	case <-v.done:
		return fmt.Errorf("%w: %v", ErrClosed, v.err)
	default:
	}
	var requests []byte
	for _, message := range messages {
		requests = append(requests, message...)
	}
	if err := v.conn.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
		return fmt.Errorf("%w: %v", ErrClosed, err)
	}
	if _, err := v.conn.Write(requests); err != nil {
		return fmt.Errorf("%w: %v", ErrClosed, err)
	}
	return nil
}

// now is the event time in milliseconds
func (v *VirtualInput) now() uint32 {
	return uint32(time.Since(v.start).Milliseconds())
}

func state(down bool) uint32 {
	if down {
		return 1
	}
	return 0
}

// Int is an int argument
func Int(value int) []byte {
	return binary.LittleEndian.AppendUint32(nil, uint32(int32(value)))
}

// Fixed is a fixed argument, a signed 24.8 number
func Fixed(value int) []byte {
	return Int(value * 256)
}
