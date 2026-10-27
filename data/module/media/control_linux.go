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

// repeatStatuses maps the repeat values clients send to MPRIS's LoopStatus
var repeatStatuses = map[string]string{
	"NONE":  "None",
	"TRACK": "Track",
	"LIST":  "Playlist",
}

// ControlRequest is one media control. Player is a player's ID from the
// module's players, or empty for the player the module reports. Position,
// Volume, Shuffle and Repeat are the values SEEK, SET_VOLUME, SET_SHUFFLE and
// SET_REPEAT need.
type ControlRequest struct {
	Action   string
	Player   string
	Position *float64 // Seconds from the start of the track
	Volume   *float64 // 0 to 1
	Shuffle  *bool
	Repeat   string // NONE, TRACK or LIST
}

// Control acts on a player. Action is one of PLAY, PAUSE, NEXT, PREVIOUS,
// STOP, VOLUME_UP, VOLUME_DOWN, MUTE, SEEK, SET_VOLUME, SET_SHUFFLE or
// SET_REPEAT.
func Control(ctx context.Context, request ControlRequest) error {
	players, err := listPlayers(ctx)
	if err != nil {
		return err
	}
	player, err := findPlayer(players, request.Player)
	if err != nil {
		return err
	}

	switch request.Action {
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
		return setPlayer(ctx, player.instance, "Volume", nextVolume(player.instance, request.Action, volume))
	case "SEEK":
		if request.Position == nil || *request.Position < 0 {
			return errors.New("SEEK needs a position of 0 or more seconds")
		}
		if !player.can("CanSeek") {
			return fmt.Errorf("%s can't seek", player.instance)
		}
		track, ok := player.trackID()
		if !ok {
			return fmt.Errorf("%s isn't playing a track it can seek in", player.instance)
		}
		return callPlayer(ctx, player.instance, "SetPosition", track, int64(*request.Position*1e6))
	case "SET_VOLUME":
		if request.Volume == nil || *request.Volume < 0 || *request.Volume > 1 {
			return errors.New("SET_VOLUME needs a volume from 0 to 1")
		}
		mutedVolumes.Delete(player.instance)
		return setPlayer(ctx, player.instance, "Volume", *request.Volume)
	case "SET_SHUFFLE":
		if request.Shuffle == nil {
			return errors.New("SET_SHUFFLE needs shuffle")
		}
		if _, ok := player.properties["Shuffle"]; !ok {
			return fmt.Errorf("%s doesn't support shuffle", player.instance)
		}
		return setPlayer(ctx, player.instance, "Shuffle", *request.Shuffle)
	case "SET_REPEAT":
		loopStatus, ok := repeatStatuses[request.Repeat]
		if !ok {
			return errors.New("SET_REPEAT needs repeat as NONE, TRACK or LIST")
		}
		if _, ok := player.properties["LoopStatus"]; !ok {
			return fmt.Errorf("%s doesn't support repeat", player.instance)
		}
		return setPlayer(ctx, player.instance, "LoopStatus", loopStatus)
	default:
		return fmt.Errorf("unsupported media action: %s", request.Action)
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
