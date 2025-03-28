//go:build windows
// +build windows

package keyboard

import (
	"errors"
	"time"
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
	return errors.New("keyboard automation not supported on this platform")
}

// SendText sends text input
func SendText(text string) error {
	// TODO: Find implementation
	return errors.New("keyboard automation not supported on this platform")
}
