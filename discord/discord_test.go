package discord

import (
	"bytes"
	"encoding/json"
	"net"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/types"
)

func TestFrameRoundTrip(t *testing.T) {
	var buf bytes.Buffer
	require.NoError(t, writeFrame(&buf, opFrame, map[string]string{"cmd": "PING"}))

	op, body, err := readFrame(&buf)
	require.NoError(t, err)
	assert.Equal(t, opFrame, op)
	assert.JSONEq(t, `{"cmd":"PING"}`, string(body))
}

func TestReadFrameRejectsOversizedLength(t *testing.T) {
	header := []byte{1, 0, 0, 0, 0xff, 0xff, 0xff, 0xff}
	_, _, err := readFrame(bytes.NewReader(header))
	assert.Error(t, err)
}

func TestControlArgs(t *testing.T) {
	yes, no := true, false
	devices := &types.DiscordAudio{Devices: []types.DiscordDevice{{ID: "default"}, {ID: "MOMENTUM 4"}}}

	num := func(v float64) ControlParams { return ControlParams{Value: &v} }

	tests := []struct {
		name    string
		action  Action
		params  ControlParams
		state   types.DiscordData
		want    string
		wantErr error
	}{
		{name: "mute", action: ActionMute, want: `{"mute":true}`},
		{name: "unmute", action: ActionUnmute, want: `{"mute":false}`},
		{name: "toggle mute when unmuted", action: ActionToggleMute, state: types.DiscordData{Mute: &no}, want: `{"mute":true}`},
		{name: "toggle mute when deafened", action: ActionToggleMute, state: types.DiscordData{Mute: &no, Deaf: &yes}, want: `{"mute":false}`},
		{name: "toggle deafen", action: ActionToggleDeafen, state: types.DiscordData{Deaf: &yes}, want: `{"deaf":false}`},
		{name: "input volume", action: ActionSetInputVolume, params: num(100), want: `{"input":{"volume":100}}`},
		{name: "input volume 0", action: ActionSetInputVolume, params: num(0), want: `{"input":{"volume":0}}`},
		{name: "input volume out of range", action: ActionSetInputVolume, params: num(150), wantErr: ErrInvalidValue},
		{name: "volume missing", action: ActionSetOutputVolume, wantErr: ErrInvalidValue},
		{name: "input device", action: ActionSetInputDevice, params: ControlParams{DeviceID: "MOMENTUM 4"}, state: types.DiscordData{Input: devices}, want: `{"input":{"device_id":"MOMENTUM 4"}}`},
		{name: "unknown output device", action: ActionSetOutputDevice, params: ControlParams{DeviceID: "Speakers"}, state: types.DiscordData{Output: devices}, wantErr: ErrInvalidValue},
		{name: "device missing", action: ActionSetOutputDevice, wantErr: ErrInvalidValue},
		{name: "voice mode", action: ActionSetVoiceMode, params: ControlParams{Mode: "PUSH_TO_TALK"}, want: `{"mode":{"type":"PUSH_TO_TALK"}}`},
		{name: "unknown voice mode", action: ActionSetVoiceMode, params: ControlParams{Mode: "SHOUTING"}, wantErr: ErrInvalidValue},
		{name: "voice threshold", action: ActionSetVoiceThreshold, params: num(-60), want: `{"mode":{"threshold":-60}}`},
		{name: "voice threshold above 0", action: ActionSetVoiceThreshold, params: num(5), wantErr: ErrInvalidValue},
		{name: "push to talk delay 0", action: ActionSetPushToTalkDelay, params: num(0), want: `{"mode":{"delay":0}}`},
		{name: "toggle qos when unknown", action: ActionToggleQoS, want: `{"qos":true}`},
		{name: "disable silence warning", action: ActionDisableSilenceWarn, want: `{"silence_warning":false}`},
		{name: "toggle silence warning", action: ActionToggleSilenceWarn, state: types.DiscordData{SilenceWarning: &yes}, want: `{"silence_warning":false}`},
		{name: "noise suppression is not controllable", action: "ENABLE_NOISE_SUPPRESSION", wantErr: ErrInvalidAction},
		{name: "unknown action", action: "DANCE", wantErr: ErrInvalidAction},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := controlArgs(tt.action, tt.params, tt.state)
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			body, err := json.Marshal(got)
			require.NoError(t, err)
			assert.JSONEq(t, tt.want, string(body))
		})
	}
}

// fakeDiscord answers each request on the server side of a pipe.
func fakeDiscord(t *testing.T, conn net.Conn, reply func(req map[string]any) map[string]any) {
	t.Helper()
	go func() {
		for {
			_, body, err := readFrame(conn)
			if err != nil {
				return
			}
			var req map[string]any
			if json.Unmarshal(body, &req) != nil {
				return
			}
			if err := writeFrame(conn, opFrame, reply(req)); err != nil {
				return
			}
		}
	}()
}

func TestSessionCall(t *testing.T) {
	client, server := net.Pipe()
	t.Cleanup(func() { _ = client.Close(); _ = server.Close() })

	fakeDiscord(t, server, func(req map[string]any) map[string]any {
		if req["cmd"] == "AUTHENTICATE" {
			return map[string]any{"cmd": req["cmd"], "nonce": req["nonce"], "evt": "ERROR", "data": map[string]any{"code": 4009, "message": "invalid token"}}
		}
		return map[string]any{"cmd": req["cmd"], "nonce": req["nonce"], "data": map[string]any{"mute": true}}
	})

	s := newSession(client)
	go s.readLoop()

	data, err := s.call(t.Context(), "GET_VOICE_SETTINGS", nil, "", time.Second)
	require.NoError(t, err)
	assert.JSONEq(t, `{"mute":true}`, string(data))

	_, err = s.call(t.Context(), "AUTHENTICATE", nil, "", time.Second)
	assert.ErrorContains(t, err, "invalid token")
	assert.ErrorIs(t, err, errRejected)
}

func TestSessionAppliesVoiceUpdates(t *testing.T) {
	client, server := net.Pipe()
	t.Cleanup(func() { _ = client.Close(); _ = server.Close() })

	updates := make(chan types.DiscordData, 1)
	mu.Lock()
	state, onUpdate = types.DiscordData{}, func(d types.DiscordData) { updates <- d }
	mu.Unlock()
	t.Cleanup(func() {
		mu.Lock()
		state, onUpdate = types.DiscordData{}, nil
		mu.Unlock()
	})

	s := newSession(client)
	go s.readLoop()

	require.NoError(t, writeFrame(server, opFrame, map[string]any{
		"cmd": "DISPATCH", "evt": "VOICE_SETTINGS_UPDATE",
		"data": map[string]any{
			"deaf":   true,
			"output": map[string]any{"volume": 199.52623149688796},
			"input": map[string]any{
				"device_id":         "mic",
				"available_devices": []map[string]any{{"id": "mic", "name": "Microphone"}},
			},
			"mode":              map[string]any{"type": "PUSH_TO_TALK"},
			"noise_suppression": true,
		},
	}))

	select {
	case d := <-updates:
		require.NotNil(t, d.Deaf)
		assert.True(t, *d.Deaf)
		require.NotNil(t, d.Output)
		require.NotNil(t, d.Output.Volume)
		assert.Equal(t, 200.0, *d.Output.Volume)
		assert.Equal(t, []types.DiscordDevice{}, d.Output.Devices)
		require.NotNil(t, d.Input)
		assert.Nil(t, d.Input.Volume)
		require.NotNil(t, d.Input.DeviceID)
		assert.Equal(t, "mic", *d.Input.DeviceID)
		assert.Equal(t, []types.DiscordDevice{{ID: "mic", Name: "Microphone"}}, d.Input.Devices)
		require.NotNil(t, d.Mode)
		require.NotNil(t, d.Mode.Type)
		assert.Equal(t, "PUSH_TO_TALK", *d.Mode.Type)
		require.NotNil(t, d.Processing)
		require.NotNil(t, d.Processing.NoiseSuppression)
		assert.True(t, *d.Processing.NoiseSuppression)
		assert.Nil(t, d.Processing.EchoCancellation)
	case <-time.After(time.Second):
		t.Fatal("no state update")
	}
}

func TestChannelArgs(t *testing.T) {
	tests := []struct {
		name    string
		action  Action
		params  ControlParams
		want    string
		wantErr error
	}{
		{name: "join", action: ActionJoinVoiceChannel, params: ControlParams{ChannelID: "1"}, want: `{"channel_id":"1","force":true}`},
		{name: "join without channel", action: ActionJoinVoiceChannel, wantErr: ErrInvalidValue},
		{name: "leave", action: ActionLeaveVoiceChannel, want: `{"channel_id":null}`},
		{name: "open text channel", action: ActionOpenTextChannel, params: ControlParams{ChannelID: "2"}, want: `{"channel_id":"2"}`},
		{name: "open without channel", action: ActionOpenTextChannel, wantErr: ErrInvalidValue},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := channelArgs(tt.action, tt.params)
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			body, err := json.Marshal(got)
			require.NoError(t, err)
			assert.JSONEq(t, tt.want, string(body))
		})
	}
}

func TestCallEventsOnlyApplyToMe(t *testing.T) {
	updates := make(chan types.DiscordData, 10)
	mu.Lock()
	state = types.DiscordData{
		User: &types.DiscordUser{ID: "me"},
		Call: &types.DiscordCall{Me: &types.DiscordCallMember{}},
	}
	onUpdate = func(d types.DiscordData) { updates <- d }
	mu.Unlock()
	t.Cleanup(func() {
		mu.Lock()
		state, onUpdate = types.DiscordData{}, nil
		mu.Unlock()
	})

	applySpeaking(json.RawMessage(`{"user_id":"someone"}`), true)
	applyVoiceState(json.RawMessage(`{"user":{"id":"someone"},"voice_state":{"mute":true}}`))
	assert.Empty(t, updates)

	applySpeaking(json.RawMessage(`{"user_id":"me"}`), true)
	applyVoiceState(json.RawMessage(`{"user":{"id":"me"},"nick":"Me","voice_state":{"mute":true}}`))
	require.Len(t, updates, 2)
	<-updates
	d := <-updates
	require.NotNil(t, d.Call.Me)
	assert.Equal(t, types.DiscordCallMember{Nick: new("Me"), ServerMute: true, Speaking: true}, *d.Call.Me)
}

func TestControlWithoutConnection(t *testing.T) {
	assert.ErrorIs(t, Control(t.Context(), ActionMute, ControlParams{}), ErrNotConnected)
}
