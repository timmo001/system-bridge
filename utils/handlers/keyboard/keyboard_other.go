//go:build !windows
// +build !windows

package keyboard

import (
	"strings"
	"time"

	"github.com/go-vgo/robotgo"
)

func sendKeypress(data KeypressData) error {
	// Use provided delay
	if data.Delay > 0 {
		time.Sleep(time.Duration(data.Delay) * time.Millisecond)
	}

	// Convert modifiers to robotgo format
	var modifiers []any
	for _, mod := range data.Modifiers {
		mod = strings.ToLower(mod)
		switch mod {
		case "shift":
			modifiers = append(modifiers, "shift")
		case "ctrl", "control":
			modifiers = append(modifiers, "ctrl")
		case "alt":
			modifiers = append(modifiers, "alt")
		case "cmd", "command":
			modifiers = append(modifiers, "cmd")
		}
	}

	if len(modifiers) > 0 {
		return robotgo.KeyTap(data.Key, modifiers...)
	}
	return robotgo.KeyTap(data.Key)
}

func sendText(text string) error {
	robotgo.TypeStr(text)
	return nil
}
