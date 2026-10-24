//go:build linux

package media

import (
	"fmt"
	"log/slog"
	"os/exec"
	"strings"
)

// activePlayer picks the player the Media module reports: the first one
// playing, then the first one paused, else the first. An empty name leaves
// the choice to playerctl.
func activePlayer() string {
	output, err := exec.Command("playerctl", "metadata", "--all-players", "--format", "{{playerInstance}}\t{{status}}").Output()
	if err != nil {
		slog.Debug("Could not list media players", "error", err)
		return ""
	}

	var players, statuses []string
	for _, line := range strings.Split(strings.TrimSpace(string(output)), "\n") {
		name, status, found := strings.Cut(line, "\t")
		if !found || name == "" {
			continue
		}
		players = append(players, name)
		statuses = append(statuses, status)
	}

	for _, wanted := range []string{"playing", "paused"} {
		for i, status := range statuses {
			if strings.EqualFold(status, wanted) {
				return players[i]
			}
		}
	}

	if len(players) > 0 {
		return players[0]
	}

	return ""
}

func control(action MediaAction) error {
	var args []string

	switch action {
	case MediaActionPlay:
		args = []string{"play"}
	case MediaActionPause:
		args = []string{"pause"}
	case MediaActionNext:
		args = []string{"next"}
	case MediaActionPrevious:
		args = []string{"previous"}
	case MediaActionStop:
		args = []string{"stop"}
	case MediaActionVolumeUp:
		args = []string{"volume", "0.05+"}
	case MediaActionVolumeDown:
		args = []string{"volume", "0.05-"}
	case MediaActionMute:
		args = []string{"volume", "0"}
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}

	// Act on the player the Media module shows, not whichever playerctl
	// happens to pick first
	if player := activePlayer(); player != "" {
		args = append([]string{"--player", player}, args...)
	}

	if err := exec.Command("playerctl", args...).Run(); err != nil {
		return fmt.Errorf("error running playerctl %s: %v", strings.Join(args, " "), err)
	}

	return nil
}
