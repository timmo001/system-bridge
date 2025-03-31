//go:build windows
// +build windows

package keyboard

import (
	"errors"
	"time"
)

func sendKeypress(data KeypressData) error {
	// Use provided delay
	if data.Delay > 0 {
		time.Sleep(time.Duration(data.Delay) * time.Millisecond)
	}

	// TODO: Find implementation
	return errors.New("keyboard automation not supported on this platform")
}

func sendText(text string) error {
	// TODO: Find implementation
	return errors.New("keyboard automation not supported on this platform")
}
