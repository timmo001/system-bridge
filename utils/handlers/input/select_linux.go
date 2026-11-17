package input

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
	"unicode"

	"github.com/go-vgo/robotgo/libei"

	"github.com/timmo001/system-bridge/utils/wayland"
)

// selectBackend tries the compositor's virtual keyboard and pointer, then the
// RemoteDesktop portal, then X11. The portal asks the person for consent the
// first time, and a zero move checks it can send input.
func selectBackend() (Backend, string) {
	var reasons []string

	// The socket is found without WAYLAND_DISPLAY too, as a service can start
	// without the session's display
	if _, err := wayland.Socket(); err == nil {
		virtual, err := wayland.NewVirtualInput(connectTimeout)
		if err == nil {
			return waylandBackend{virtual}, ""
		}
		reasons = append(reasons, "Wayland virtual input: "+err.Error())

		err = libei.MoveRelative(0, 0)
		if err == nil {
			return libeiBackend{}, ""
		}
		libei.Close()
		reasons = append(reasons, "RemoteDesktop portal: "+err.Error())
	}

	if os.Getenv("DISPLAY") != "" {
		return robotgoBackend{name: "x11"}, ""
	}

	if len(reasons) == 0 {
		return nil, "No Wayland or X11 display found"
	}
	return nil, strings.Join(reasons, "; ")
}

const connectTimeout = 5 * time.Second

// waylandBackend sends input through the compositor's virtual pointer and
// keyboard, on wlroots compositors such as Hyprland and Sway
type waylandBackend struct{ virtual *wayland.VirtualInput }

func (waylandBackend) Name() string { return "wayland" }

func (b waylandBackend) KeyTap(key string, modifiers ...any) error {
	press, err := waylandKeyPress(key)
	if err != nil {
		return err
	}
	for _, modifier := range modifiers {
		// robotgo takes modifiers as names or a list of them, and ignores
		// anything else, such as a process ID
		var names []string
		switch value := modifier.(type) {
		case string:
			names = []string{value}
		case []string:
			names = value
		}
		for _, name := range names {
			held, err := waylandModifier(name)
			if err != nil {
				return err
			}
			press.Modifiers = append(press.Modifiers, held)
		}
	}
	return b.virtual.Press(press)
}

// TypeStr types plain ASCII text, as the keymap is US. It checks the whole
// text first, rather than typing half of it.
func (b waylandBackend) TypeStr(text string) error {
	presses := make([]wayland.KeyPress, 0, len(text))
	for _, char := range text {
		key := string(char)
		if name, ok := whitespaceKeys[char]; ok {
			key = name
		} else if char > unicode.MaxASCII || unicode.IsControl(char) {
			return fmt.Errorf("can't type %q: the Wayland virtual keyboard only types plain ASCII text", char)
		}
		var shift bool
		if unshifted, ok := shiftedKeys[char]; ok {
			key, shift = unshifted, true
		}
		press, err := waylandKeyPress(key)
		if err != nil {
			return err
		}
		if shift {
			press.Modifiers = append(press.Modifiers, wayland.Shift)
		}
		presses = append(presses, press)
	}
	return b.virtual.Press(presses...)
}

// waylandKeyPress finds a key by robotgo's name for it. A single capital
// letter is that letter with shift.
func waylandKeyPress(key string) (wayland.KeyPress, error) {
	if code, ok := waylandKeys[strings.ToLower(key)]; ok {
		press := wayland.KeyPress{Code: code}
		if len(key) == 1 && unicode.IsUpper(rune(key[0])) {
			press.Modifiers = []wayland.Modifier{wayland.Shift}
		}
		return press, nil
	}
	return wayland.KeyPress{}, fmt.Errorf("unknown key %q", key)
}

func waylandModifier(name string) (wayland.Modifier, error) {
	switch strings.ToLower(name) {
	case "shift":
		return wayland.Shift, nil
	case "ctrl", "control":
		return wayland.Ctrl, nil
	case "alt":
		return wayland.Alt, nil
	case "cmd", "command", "super":
		return wayland.Super, nil
	default:
		return wayland.Modifier{}, fmt.Errorf("unknown modifier %q", name)
	}
}

func (b waylandBackend) MoveRelative(dx, dy int) error { return b.virtual.Move(dx, dy) }

func (b waylandBackend) Click(button string, double bool) error {
	code, err := waylandButton(button)
	if err != nil {
		return err
	}
	return b.virtual.Click(code, double)
}

func (b waylandBackend) Toggle(button string, down bool) error {
	code, err := waylandButton(button)
	if err != nil {
		return err
	}
	return b.virtual.Button(code, down)
}

func waylandButton(button string) (uint32, error) {
	switch button {
	case "left":
		return wayland.ButtonLeft, nil
	case "right":
		return wayland.ButtonRight, nil
	case "center":
		return wayland.ButtonMiddle, nil
	default:
		return 0, fmt.Errorf("unknown button %q", button)
	}
}

// Scroll takes robotgo's directions, where positive scrolls up and left
func (b waylandBackend) Scroll(x, y int) error { return b.virtual.Scroll(-x, -y) }

func (b waylandBackend) Close() { _ = b.virtual.Close() }

type libeiBackend struct{}

func (libeiBackend) Name() string { return "libei" }

func (libeiBackend) KeyTap(key string, modifiers ...any) error {
	return libei.KeyTap(key, modifiers...)
}

func (libeiBackend) TypeStr(text string) error { return libei.TypeStr(text) }

func (libeiBackend) MoveRelative(dx, dy int) error { return libei.MoveRelative(dx, dy) }

func (libeiBackend) Click(button string, double bool) error {
	return libei.Click(button, double)
}

func (libeiBackend) Toggle(button string, down bool) error {
	return libei.Toggle(button, direction(down))
}

func (libeiBackend) Scroll(x, y int) error { return libei.Scroll(x, y) }

func (libeiBackend) Close() { libei.Close() }

// lostConnection reports whether the backend's connection to the compositor or
// portal has gone, so it should be chosen again.
func lostConnection(err error) bool {
	return errors.Is(err, wayland.ErrClosed) || errors.Is(err, libei.ErrNoConnection)
}
