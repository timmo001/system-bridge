//go:build linux

package media

import (
	"fmt"
	"os/exec"
)

func control(action MediaAction) error {
	var cmd *exec.Cmd

	switch action {
	case MediaActionPlay, MediaActionPause:
		cmd = exec.Command("playerctl", "play-pause")
	case MediaActionNext:
		cmd = exec.Command("playerctl", "next")
	case MediaActionPrevious:
		cmd = exec.Command("playerctl", "previous")
	case MediaActionStop:
		cmd = exec.Command("playerctl", "stop")
	case MediaActionVolumeUp:
		cmd = exec.Command("playerctl", "volume", "0.05+")
	case MediaActionVolumeDown:
		cmd = exec.Command("playerctl", "volume", "0.05-")
	case MediaActionMute:
		cmd = exec.Command("playerctl", "volume", "0")
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}

	return cmd.Run()
}
