package keyboard

import (
	"strings"
	"time"

	"github.com/go-vgo/robotgo"
)

// KeypressData represents the data needed for a keyboard keypress
type KeypressData struct {
	Key       string   `json:"key" mapstructure:"key"`
	Modifiers []string `json:"modifiers" mapstructure:"modifiers"`
	Delay     int      `json:"delay" mapstructure:"delay"` // Delay in milliseconds
}

// SendKeypress sends a keyboard keypress with optional modifiers and delay
func SendKeypress(data KeypressData) error {
	// Use provided delay
	if data.Delay > 0 {
		time.Sleep(time.Duration(data.Delay) * time.Millisecond)
	}

	// Convert modifiers to robotgo format
	var modifiers []interface{}
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

// SendText sends text input
func SendText(text string) error {
	return robotgo.TypeStr(text)
}
