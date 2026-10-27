//go:build linux

package media

import (
	"context"
	"errors"
	"fmt"
	"sync"
)

const volumeStep = 0.05

// mutedVolumes holds each muted player's volume from before it was muted, so
// muting again can put it back
var mutedVolumes sync.Map

// Control acts on the player the module reports. action is one of PLAY,
// PAUSE, NEXT, PREVIOUS, STOP, VOLUME_UP, VOLUME_DOWN or MUTE.
func Control(ctx context.Context, action string) error {
	players, err := listPlayers(ctx)
	if err != nil {
		return err
	}
	player := pickPlayer(players)
	if player == nil {
		return errors.New("no media player is running")
	}

	switch action {
	case "PLAY":
		return callPlayer(ctx, player.instance, "Play")
	case "PAUSE":
		return callPlayer(ctx, player.instance, "Pause")
	case "NEXT":
		return callPlayer(ctx, player.instance, "Next")
	case "PREVIOUS":
		return callPlayer(ctx, player.instance, "Previous")
	case "STOP":
		return callPlayer(ctx, player.instance, "Stop")
	case "VOLUME_UP", "VOLUME_DOWN", "MUTE":
		volume, ok := player.properties["Volume"].Value().(float64)
		if !ok {
			return fmt.Errorf("%s doesn't report its volume", player.instance)
		}
		return setPlayer(ctx, player.instance, "Volume", nextVolume(player.instance, action, volume))
	default:
		return fmt.Errorf("unsupported media action: %s", action)
	}
}

// nextVolume is the volume an action moves a player to. Mute sets it to 0,
// or back to its volume from before when it's already muted.
func nextVolume(instance, action string, volume float64) float64 {
	switch action {
	case "VOLUME_UP":
		mutedVolumes.Delete(instance)
		return min(volume+volumeStep, 1)
	case "VOLUME_DOWN":
		mutedVolumes.Delete(instance)
		return max(volume-volumeStep, 0)
	}
	if volume == 0 {
		if previous, ok := mutedVolumes.LoadAndDelete(instance); ok {
			return previous.(float64)
		}
		return 0
	}
	mutedVolumes.Store(instance, volume)
	return 0
}
