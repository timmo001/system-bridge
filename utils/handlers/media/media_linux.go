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
	case MediaActionVolumeUp:
		cmd = exec.Command("playerctl", "volume-up")
	case MediaActionVolumeDown:
		cmd = exec.Command("playerctl", "volume-down")
	case MediaActionMute:
		cmd = exec.Command("playerctl", "mute")
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}

	return cmd.Run()
}
