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

func TestCallMemberEvents(t *testing.T) {
	updates := make(chan types.DiscordData, 10)
	mu.Lock()
	state = types.DiscordData{
		User: &types.DiscordUser{ID: "me"},
		Call: &types.DiscordCall{Members: []types.DiscordCallMember{{User: types.DiscordUser{ID: "me"}}}},
	}
	onUpdate = func(d types.DiscordData) { updates <- d }
	mu.Unlock()
	t.Cleanup(func() {
		mu.Lock()
		state, onUpdate = types.DiscordData{}, nil
		mu.Unlock()
	})
	latest := func() types.DiscordData {
		t.Helper()
		require.NotEmpty(t, updates)
		var d types.DiscordData
		for len(updates) > 0 {
			d = <-updates
		}
		return d
	}

	applySpeaking(json.RawMessage(`{"user_id":"stranger"}`), true)
	assert.Empty(t, updates)

	applyVoiceState(json.RawMessage(`{"user":{"id":"friend","username":"friend"},"mute":true,"volume":100,"voice_state":{"self_deaf":true}}`))
	applySpeaking(json.RawMessage(`{"user_id":"friend"}`), true)
	applySpeaking(json.RawMessage(`{"user_id":"me"}`), true)
	applyVoiceState(json.RawMessage(`{"user":{"id":"me"},"nick":"Me","mute":false,"volume":100,"voice_state":{"mute":true}}`))
	d := latest()
	require.Len(t, d.Call.Members, 2)
	assert.Equal(t, types.DiscordCallMember{
		User:      types.DiscordUser{ID: "friend", Username: "friend"},
		SelfDeaf:  true,
		Speaking:  true,
		LocalMute: new(true),
		Volume:    new(100.0),
	}, d.Call.Members[1])
	// The local settings only apply to other users.
	want := types.DiscordCallMember{User: types.DiscordUser{ID: "me"}, Nick: new("Me"), ServerMute: true, Speaking: true}
	assert.Equal(t, want, d.Call.Members[0])
	require.NotNil(t, d.Call.Me)
	assert.Equal(t, want, *d.Call.Me)

	applyUserVoice(json.RawMessage(`{"user_id":"friend","mute":false}`))
	d = latest()
	assert.Equal(t, new(false), d.Call.Members[1].LocalMute)
	assert.Equal(t, new(100.0), d.Call.Members[1].Volume)

	applyVoiceStateDelete(json.RawMessage(`{"user":{"id":"friend"}}`))
	d = latest()
	require.Len(t, d.Call.Members, 1)
	assert.Equal(t, "me", d.Call.Members[0].User.ID)
}

func TestUserArgs(t *testing.T) {
	no := false
	call := types.DiscordData{Call: &types.DiscordCall{Members: []types.DiscordCallMember{
		{User: types.DiscordUser{ID: "friend"}, LocalMute: &no},
		{User: types.DiscordUser{ID: "unknown"}},
	}}}
	num := func(v float64) *float64 { return &v }

	tests := []struct {
		name    string
		action  Action
		params  ControlParams
		want    string
		wantErr error
	}{
		{name: "mute user", action: ActionMuteUser, params: ControlParams{UserID: "1"}, want: `{"user_id":"1","mute":true}`},
		{name: "unmute user", action: ActionUnmuteUser, params: ControlParams{UserID: "1"}, want: `{"user_id":"1","mute":false}`},
		{name: "toggle user mute", action: ActionToggleUserMute, params: ControlParams{UserID: "friend"}, want: `{"user_id":"friend","mute":true}`},
		{name: "toggle user mute when unknown", action: ActionToggleUserMute, params: ControlParams{UserID: "unknown"}, want: `{"user_id":"unknown","mute":true}`},
		{name: "toggle user mute outside the call", action: ActionToggleUserMute, params: ControlParams{UserID: "1"}, wantErr: ErrInvalidValue},
		{name: "user volume", action: ActionSetUserVolume, params: ControlParams{UserID: "1", Value: num(100)}, want: `{"user_id":"1","volume":100}`},
		{name: "user volume out of range", action: ActionSetUserVolume, params: ControlParams{UserID: "1", Value: num(201)}, wantErr: ErrInvalidValue},
		{name: "user missing", action: ActionMuteUser, wantErr: ErrInvalidValue},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := userArgs(tt.action, tt.params, call)
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

func TestSoundArgs(t *testing.T) {
	server := "3"
	st := types.DiscordData{
		Call:   &types.DiscordCall{Channel: types.DiscordChannel{ID: "2"}},
		Sounds: &[]types.DiscordSound{{ID: "1"}, {ID: "10", ServerID: &server}},
	}

	tests := []struct {
		name    string
		params  ControlParams
		state   types.DiscordData
		want    string
		wantErr error
	}{
		{name: "default sound", params: ControlParams{SoundID: "1"}, state: st, want: `{"sound_id":"1","guild_id":"0","channel_id":"2"}`},
		{name: "server sound", params: ControlParams{SoundID: "10"}, state: st, want: `{"sound_id":"10","guild_id":"3","channel_id":"2"}`},
		{name: "unknown sound", params: ControlParams{SoundID: "4"}, state: st, wantErr: ErrInvalidValue},
		{name: "sound missing", state: st, wantErr: ErrInvalidValue},
		{name: "not in a call", params: ControlParams{SoundID: "1"}, state: types.DiscordData{Sounds: st.Sounds}, wantErr: ErrInvalidValue},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := soundArgs(tt.params, tt.state)
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

func TestHasScopes(t *testing.T) {
	assert.False(t, hasScopes(json.RawMessage(`{"scopes":["rpc"]}`)))
	assert.True(t, hasScopes(json.RawMessage(`{"scopes":["rpc.voice.read","rpc","rpc.video.read","rpc.video.write","rpc.screenshare.read","rpc.screenshare.write"]}`)))
}

func TestSoundsAndActiveStates(t *testing.T) {
	client, server := net.Pipe()
	t.Cleanup(func() { _ = client.Close(); _ = server.Close() })
	mu.Lock()
	state = types.DiscordData{}
	mu.Unlock()
	t.Cleanup(func() {
		mu.Lock()
		state = types.DiscordData{}
		mu.Unlock()
	})

	fakeDiscord(t, server, func(req map[string]any) map[string]any {
		return map[string]any{"cmd": req["cmd"], "nonce": req["nonce"], "data": []map[string]any{
			{"name": "quack", "available": true, "sound_id": "1", "guild_id": "0", "emoji_id": nil, "emoji_name": "🦆"},
			{"name": "Listen", "available": true, "sound_id": "11", "guild_id": "3", "emoji_id": "4", "emoji_name": nil},
			{"name": "locked", "available": false, "sound_id": "12", "guild_id": "5"},
		}}
	})
	s := newSession(client)
	go s.readLoop()

	require.NoError(t, refreshSounds(t.Context(), s))
	applyActive(json.RawMessage(`{"active":true,"pid":1,"application":{"name":"Firefox"}}`), func(d *types.DiscordData) **bool { return &d.Screenshare })

	d := State()
	require.NotNil(t, d.Sounds)
	assert.Equal(t, []types.DiscordSound{
		{ID: "1", Name: "quack", Emoji: new("🦆")},
		{ID: "11", Name: "Listen", ServerID: new("3"), EmojiURL: new("https://cdn.discordapp.com/emojis/4.png")},
	}, *d.Sounds)
	assert.Equal(t, new(true), d.Screenshare)
	assert.Nil(t, d.Video)
}

func TestControlWithoutConnection(t *testing.T) {
	assert.ErrorIs(t, Control(t.Context(), ActionMute, ControlParams{}), ErrNotConnected)
}
