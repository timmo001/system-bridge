// Package mouse moves the pointer, clicks and scrolls, through the input
// backend.
package mouse

import (
	"fmt"
	"strings"

	"github.com/timmo001/system-bridge/utils/handlers/input"
)

// The most a single request moves or scrolls, so a bad value can't throw
// the pointer far off or scroll a page away.
const (
	maxMove   = 2000
	maxScroll = 50
)

// MoveData moves the pointer by an amount, in pixels.
type MoveData struct {
	X int `json:"x" mapstructure:"x"`
	Y int `json:"y" mapstructure:"y"`
}

// ClickData clicks a button: left (the default), right or middle.
type ClickData struct {
	Button string `json:"button" mapstructure:"button"`
	Double bool   `json:"double" mapstructure:"double"`
}

// ButtonData holds a button down or releases it, to drag.
type ButtonData struct {
	Button string `json:"button" mapstructure:"button"`
	Action string `json:"action" mapstructure:"action"` // down or up
}

// ScrollData scrolls by wheel notches. Positive y scrolls up, positive x
// right.
type ScrollData struct {
	X int `json:"x" mapstructure:"x"`
	Y int `json:"y" mapstructure:"y"`
}

// ValidateClick returns why a click can't be sent, or an empty string.
func ValidateClick(data ClickData) string {
	if _, err := buttonName(data.Button); err != nil {
		return err.Error()
	}
	return ""
}

// ValidateButton returns why a button change can't be sent, or an empty
// string.
func ValidateButton(data ButtonData) string {
	if _, err := buttonName(data.Button); err != nil {
		return err.Error()
	}
	if _, err := isDown(data.Action); err != nil {
		return err.Error()
	}
	return ""
}

// Move moves the pointer by an amount.
func Move(data MoveData) error {
	if data.X == 0 && data.Y == 0 {
		return nil
	}
	return input.Use(func(backend input.Backend) error {
		return backend.MoveRelative(clamp(data.X, maxMove), clamp(data.Y, maxMove))
	})
}

// Click clicks a button.
func Click(data ClickData) error {
	button, err := buttonName(data.Button)
	if err != nil {
		return err
	}
	return input.Use(func(backend input.Backend) error { return backend.Click(button, data.Double) })
}

// Button holds a button down or releases it.
func Button(data ButtonData) error {
	button, err := buttonName(data.Button)
	if err != nil {
		return err
	}
	down, err := isDown(data.Action)
	if err != nil {
		return err
	}
	return input.Use(func(backend input.Backend) error { return backend.Toggle(button, down) })
}

// Scroll scrolls by wheel notches.
func Scroll(data ScrollData) error {
	if data.X == 0 && data.Y == 0 {
		return nil
	}
	// robotgo scrolls left for a positive x
	return input.Use(func(backend input.Backend) error {
		return backend.Scroll(-clamp(data.X, maxScroll), clamp(data.Y, maxScroll))
	})
}

// buttonName returns robotgo's name for a button.
func buttonName(button string) (string, error) {
	switch strings.ToLower(button) {
	case "", "left":
		return "left", nil
	case "right":
		return "right", nil
	case "middle":
		return "center", nil
	default:
		return "", fmt.Errorf("unknown button %q: use left, right or middle", button)
	}
}

func isDown(action string) (bool, error) {
	switch strings.ToLower(action) {
	case "down":
		return true, nil
	case "up":
		return false, nil
	default:
		return false, fmt.Errorf("unknown action %q: use down or up", action)
	}
}

func clamp(value, limit int) int {
	return max(-limit, min(limit, value))
}
