package discord

import (
	"context"
	"fmt"

	"github.com/timmo001/system-bridge/types"
)

type Action string

const (
	ActionMute            Action = "MUTE"
	ActionUnmute          Action = "UNMUTE"
	ActionToggleMute      Action = "TOGGLE_MUTE"
	ActionDeafen          Action = "DEAFEN"
	ActionUndeafen        Action = "UNDEAFEN"
	ActionToggleDeafen    Action = "TOGGLE_DEAFEN"
	ActionSetInputVolume  Action = "SET_INPUT_VOLUME"
	ActionSetOutputVolume Action = "SET_OUTPUT_VOLUME"
)

// Discord accepts input volume 0-100 and output volume 0-200.
const (
	maxInputVolume  = 100
	maxOutputVolume = 200
)

// Control changes the Discord voice settings. value is required for the
// volume actions and ignored for the others.
func Control(ctx context.Context, action Action, value *float64) error {
	mu.Lock()
	s, st := current, state
	mu.Unlock()
	if s == nil {
		return ErrNotConnected
	}

	args, err := controlArgs(action, value, st)
	if err != nil {
		return err
	}
	data, err := s.call(ctx, "SET_VOICE_SETTINGS", args, "", rpcTimeout)
	if err != nil {
		return err
	}
	applyVoice(data)
	return nil
}

func controlArgs(action Action, value *float64, st types.DiscordData) (map[string]any, error) {
	isTrue := func(b *bool) bool { return b != nil && *b }

	switch action {
	case ActionMute:
		return map[string]any{"mute": true}, nil
	case ActionUnmute:
		return map[string]any{"mute": false}, nil
	case ActionToggleMute:
		// Discord shows the user as muted while deafened.
		return map[string]any{"mute": !isTrue(st.Mute) && !isTrue(st.Deaf)}, nil
	case ActionDeafen:
		return map[string]any{"deaf": true}, nil
	case ActionUndeafen:
		return map[string]any{"deaf": false}, nil
	case ActionToggleDeafen:
		return map[string]any{"deaf": !isTrue(st.Deaf)}, nil
	case ActionSetInputVolume:
		if value == nil || *value < 0 || *value > maxInputVolume {
			return nil, fmt.Errorf("%w: input volume must be 0-%d", ErrInvalidValue, maxInputVolume)
		}
		return map[string]any{"input": map[string]any{"volume": *value}}, nil
	case ActionSetOutputVolume:
		if value == nil || *value < 0 || *value > maxOutputVolume {
			return nil, fmt.Errorf("%w: output volume must be 0-%d", ErrInvalidValue, maxOutputVolume)
		}
		return map[string]any{"output": map[string]any{"volume": *value}}, nil
	default:
		return nil, fmt.Errorf("%w: %s", ErrInvalidAction, action)
	}
}
