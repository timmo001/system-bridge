//go:build linux

package desktop

import (
	"bytes"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

// Hyprland calls anything with keys a keyboard, such as power buttons, media
// keys and a keyboard's own system control device. udev only marks devices
// with a full set of keys as ID_INPUT_KEYBOARD, so that picks out the real ones.

// duplicateSuffix is what Hyprland adds to a device's name when another device
// has it already
var duplicateSuffix = regexp.MustCompile(`-\d+$`)

var keyboardNames = struct {
	mu        sync.Mutex
	key       string          // Hyprland's keyboard names the result is for
	keyboards map[string]bool // Hyprland's names for the keyboards udev knows
}{}

// realKeyboards drops the devices udev doesn't call keyboards, keeping the main
// one, as it decides the layout. It keeps them all when udev can't tell.
func realKeyboards(keyboards []hyprlandKeyboard) []hyprlandKeyboard {
	names := make([]string, 0, len(keyboards))
	for _, keyboard := range keyboards {
		names = append(names, keyboard.Name)
	}

	keyboardNames.mu.Lock()
	key := strings.Join(names, "\n")
	if keyboardNames.key != key || keyboardNames.keyboards == nil {
		keyboardNames.key, keyboardNames.keyboards = key, udevKeyboards()
	}
	known := keyboardNames.keyboards
	keyboardNames.mu.Unlock()

	if len(known) == 0 {
		return keyboards
	}
	kept := make([]hyprlandKeyboard, 0, len(keyboards))
	for _, keyboard := range keyboards {
		if keyboard.Main || known[keyboard.Name] || known[duplicateSuffix.ReplaceAllString(keyboard.Name, "")] {
			kept = append(kept, keyboard)
		}
	}
	return kept
}

// udevKeyboards returns Hyprland's names for the input devices udev marks as
// keyboards
func udevKeyboards() map[string]bool {
	keyboards := map[string]bool{}
	devices, _ := filepath.Glob("/sys/class/input/event*")
	for _, device := range devices {
		number, err := os.ReadFile(filepath.Join(device, "dev"))
		if err != nil {
			continue
		}
		properties, err := os.ReadFile(filepath.Join("/run/udev/data", "c"+strings.TrimSpace(string(number))))
		if err != nil || !bytes.Contains(properties, []byte("\nE:ID_INPUT_KEYBOARD=1\n")) {
			continue
		}
		name, err := os.ReadFile(filepath.Join(device, "device", "name"))
		if err != nil {
			continue
		}
		keyboards[hyprlandDeviceName(strings.TrimSpace(string(name)))] = true
	}
	return keyboards
}

// hyprlandDeviceName is how Hyprland names an input device
func hyprlandDeviceName(name string) string {
	return strings.ToLower(strings.NewReplacer(" ", "-", "\n", "-", ",", "-").Replace(name))
}
