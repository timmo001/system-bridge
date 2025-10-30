//go:build darwin

package media

import (
	"fmt"
	"os/exec"
)

func control(action MediaAction) error {
	var script string

	switch action {
	case MediaActionPlay, MediaActionPause:
		script = "tell application \"System Events\" to key code 49" // Space
	case MediaActionNext:
		script = "tell application \"System Events\" to key code 124" // Right arrow
	case MediaActionPrevious:
		script = "tell application \"System Events\" to key code 123" // Left arrow
	case MediaActionStop:
		script = "tell application \"System Events\" to key code 49" // Space (same as play/pause)
	case MediaActionVolumeUp:
		script = "set volume output volume ((output volume of (get volume settings)) + 5)"
	case MediaActionVolumeDown:
		script = "set volume output volume ((output volume of (get volume settings)) - 5)"
	case MediaActionMute:
		script = "set volume with output muted"
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}

	cmd := exec.Command("osascript", "-e", script)
	return cmd.Run()
}
