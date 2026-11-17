package keyboard

import (
	"log/slog"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/utils/handlers/input"
)

// KeypressData represents the data needed for a keyboard keypress
type KeypressData struct {
	Key       string   `json:"key" mapstructure:"key"`
	Modifiers []string `json:"modifiers" mapstructure:"modifiers"`
	Delay     int      `json:"delay" mapstructure:"delay"` // Delay in milliseconds
}

// SendKeypress sends a keyboard keypress with optional modifiers and delay
func SendKeypress(data KeypressData) error {
	return sendKeypress(data)
}

// SendText sends text input
func SendText(text string) error {
	return sendText(text)
}

// indirection for testability
var (
	robotKeyTap = func(key string, args ...any) error {
		return input.Use(func(backend input.Backend) error { return backend.KeyTap(key, args...) })
	}
	robotType = func(str string, _ ...int) error {
		return input.Use(func(backend input.Backend) error { return backend.TypeStr(str) })
	}
)

func sendKeypress(data KeypressData) error {
	slog.Info("sendKeypress", "data", data)

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
		return robotKeyTap(data.Key, modifiers...)
	}
	return robotKeyTap(data.Key)
}

func sendText(text string) error {
	return robotType(text)
}
