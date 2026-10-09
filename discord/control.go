package discord

import (
	"context"
	"fmt"
	"slices"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

type Action string

const (
	ActionMute               Action = "MUTE"
	ActionUnmute             Action = "UNMUTE"
	ActionToggleMute         Action = "TOGGLE_MUTE"
	ActionDeafen             Action = "DEAFEN"
	ActionUndeafen           Action = "UNDEAFEN"
	ActionToggleDeafen       Action = "TOGGLE_DEAFEN"
	ActionSetInputVolume     Action = "SET_INPUT_VOLUME"
	ActionSetInputDevice     Action = "SET_INPUT_DEVICE"
	ActionSetOutputVolume    Action = "SET_OUTPUT_VOLUME"
	ActionSetOutputDevice    Action = "SET_OUTPUT_DEVICE"
	ActionSetVoiceMode       Action = "SET_VOICE_MODE"
	ActionSetVoiceThreshold  Action = "SET_VOICE_THRESHOLD"
	ActionSetPushToTalkDelay Action = "SET_PUSH_TO_TALK_DELAY"
	ActionEnableQoS          Action = "ENABLE_QOS"
	ActionDisableQoS         Action = "DISABLE_QOS"
	ActionToggleQoS          Action = "TOGGLE_QOS"
	ActionEnableSilenceWarn  Action = "ENABLE_SILENCE_WARNING"
	ActionDisableSilenceWarn Action = "DISABLE_SILENCE_WARNING"
	ActionToggleSilenceWarn  Action = "TOGGLE_SILENCE_WARNING"
)

// setVoiceSettings is the SET_VOICE_SETTINGS args. Discord only changes the
// fields that are sent.
type setVoiceSettings struct {
	Mute           *bool         `json:"mute,omitempty"`
	Deaf           *bool         `json:"deaf,omitempty"`
	Input          *setVoiceIO   `json:"input,omitempty"`
	Output         *setVoiceIO   `json:"output,omitempty"`
	Mode           *setVoiceMode `json:"mode,omitempty"`
	QoS            *bool         `json:"qos,omitempty"`
	SilenceWarning *bool         `json:"silence_warning,omitempty"`
}

type setVoiceIO struct {
	Volume   *float64 `json:"volume,omitempty"`
	DeviceID *string  `json:"device_id,omitempty"`
}

type setVoiceMode struct {
	Type      *string  `json:"type,omitempty"`
	Threshold *float64 `json:"threshold,omitempty"`
	Delay     *float64 `json:"delay,omitempty"`
}

// The volumes are Discord slider percentages: input 0-100, output 0-200.
const (
	maxInputVolume  = 100
	maxOutputVolume = 200
	// Voice activity sensitivity, in dB.
	minVoiceThreshold = -100
	maxVoiceThreshold = 0
	// Push to talk release delay, in milliseconds.
	maxPushToTalkDelay = 2000
)

var voiceModes = []string{"VOICE_ACTIVITY", "PUSH_TO_TALK"}

// ControlParams holds the value an action needs. Value is for the volume,
// threshold and delay actions, DeviceID for the device actions and Mode for
// SET_VOICE_MODE.
type ControlParams struct {
	Value    *float64
	DeviceID string
	Mode     string
}

// Control changes the Discord voice settings.
func Control(ctx context.Context, action Action, params ControlParams) error {
	mu.Lock()
	s, st := current, state
	mu.Unlock()
	if s == nil {
		return ErrNotConnected
	}

	args, err := controlArgs(action, params, st)
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

func controlArgs(action Action, p ControlParams, st types.DiscordData) (setVoiceSettings, error) {
	isTrue := func(b *bool) bool { return b != nil && *b }

	switch action {
	case ActionMute:
		return setVoiceSettings{Mute: new(true)}, nil
	case ActionUnmute:
		return setVoiceSettings{Mute: new(false)}, nil
	case ActionToggleMute:
		// Discord shows the user as muted while deafened.
		return setVoiceSettings{Mute: new(!isTrue(st.Mute) && !isTrue(st.Deaf))}, nil
	case ActionDeafen:
		return setVoiceSettings{Deaf: new(true)}, nil
	case ActionUndeafen:
		return setVoiceSettings{Deaf: new(false)}, nil
	case ActionToggleDeafen:
		return setVoiceSettings{Deaf: new(!isTrue(st.Deaf))}, nil
	case ActionSetInputVolume:
		v, err := numberValue(p.Value, 0, maxInputVolume, "input volume")
		if err != nil {
			return setVoiceSettings{}, err
		}
		return setVoiceSettings{Input: &setVoiceIO{Volume: new(sliderToAmplitude(v))}}, nil
	case ActionSetInputDevice:
		id, err := deviceValue(p.DeviceID, st.Input, "input device")
		if err != nil {
			return setVoiceSettings{}, err
		}
		return setVoiceSettings{Input: &setVoiceIO{DeviceID: &id}}, nil
	case ActionSetOutputVolume:
		v, err := numberValue(p.Value, 0, maxOutputVolume, "output volume")
		if err != nil {
			return setVoiceSettings{}, err
		}
		return setVoiceSettings{Output: &setVoiceIO{Volume: new(sliderToAmplitude(v))}}, nil
	case ActionSetOutputDevice:
		id, err := deviceValue(p.DeviceID, st.Output, "output device")
		if err != nil {
			return setVoiceSettings{}, err
		}
		return setVoiceSettings{Output: &setVoiceIO{DeviceID: &id}}, nil
	case ActionSetVoiceMode:
		if !slices.Contains(voiceModes, p.Mode) {
			return setVoiceSettings{}, fmt.Errorf("%w: voice mode must be one of %s", ErrInvalidValue, strings.Join(voiceModes, ", "))
		}
		return setVoiceSettings{Mode: &setVoiceMode{Type: &p.Mode}}, nil
	case ActionSetVoiceThreshold:
		v, err := numberValue(p.Value, minVoiceThreshold, maxVoiceThreshold, "voice threshold")
		if err != nil {
			return setVoiceSettings{}, err
		}
		return setVoiceSettings{Mode: &setVoiceMode{Threshold: &v}}, nil
	case ActionSetPushToTalkDelay:
		v, err := numberValue(p.Value, 0, maxPushToTalkDelay, "push to talk delay")
		if err != nil {
			return setVoiceSettings{}, err
		}
		return setVoiceSettings{Mode: &setVoiceMode{Delay: &v}}, nil
	case ActionEnableQoS:
		return setVoiceSettings{QoS: new(true)}, nil
	case ActionDisableQoS:
		return setVoiceSettings{QoS: new(false)}, nil
	case ActionToggleQoS:
		return setVoiceSettings{QoS: new(!isTrue(st.QoS))}, nil
	case ActionEnableSilenceWarn:
		return setVoiceSettings{SilenceWarning: new(true)}, nil
	case ActionDisableSilenceWarn:
		return setVoiceSettings{SilenceWarning: new(false)}, nil
	case ActionToggleSilenceWarn:
		return setVoiceSettings{SilenceWarning: new(!isTrue(st.SilenceWarning))}, nil
	}
	return setVoiceSettings{}, fmt.Errorf("%w: %s", ErrInvalidAction, action)
}

func numberValue(value *float64, minimum, maximum float64, name string) (float64, error) {
	if value == nil || *value < minimum || *value > maximum {
		return 0, fmt.Errorf("%w: %s must be %g to %g", ErrInvalidValue, name, minimum, maximum)
	}
	return *value, nil
}

// deviceValue checks the device against the ones Discord listed, when known.
func deviceValue(id string, audio *types.DiscordAudio, name string) (string, error) {
	if id == "" {
		return "", fmt.Errorf("%w: %s must be a device id", ErrInvalidValue, name)
	}
	if audio != nil && len(audio.Devices) > 0 &&
		!slices.ContainsFunc(audio.Devices, func(d types.DiscordDevice) bool { return d.ID == id }) {
		return "", fmt.Errorf("%w: unknown %s %q", ErrInvalidValue, name, id)
	}
	return id, nil
}
