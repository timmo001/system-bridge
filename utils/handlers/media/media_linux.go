package media

import (
	"fmt"
	"os/exec"
)

func control(action MediaAction) error {
	var cmd *exec.Cmd

	switch action {
	case MediaActionPlay, MediaActionPause:
		cmd = exec.Command("pavucontrol")
	case MediaActionNext:
		cmd = exec.Command("pavucontrol", "--next")
	case MediaActionPrevious:
		cmd = exec.Command("pavucontrol", "--prev")
	case MediaActionVolumeUp:
		cmd = exec.Command("pavucontrol", "--volume-up")
	case MediaActionVolumeDown:
		cmd = exec.Command("pavucontrol", "--volume-down")
	case MediaActionMute:
		cmd = exec.Command("pavucontrol", "--mute")
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}

	return cmd.Run()
}
