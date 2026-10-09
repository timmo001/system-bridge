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
	vol := func(v float64) *float64 { return &v }

	tests := []struct {
		name    string
		action  Action
		value   *float64
		state   types.DiscordData
		want    map[string]any
		wantErr error
	}{
		{name: "mute", action: ActionMute, want: map[string]any{"mute": true}},
		{name: "toggle mute when unmuted", action: ActionToggleMute, state: types.DiscordData{Mute: &no}, want: map[string]any{"mute": true}},
		{name: "toggle mute when deafened", action: ActionToggleMute, state: types.DiscordData{Mute: &no, Deaf: &yes}, want: map[string]any{"mute": false}},
		{name: "toggle deafen", action: ActionToggleDeafen, state: types.DiscordData{Deaf: &yes}, want: map[string]any{"deaf": false}},
		{name: "input volume", action: ActionSetInputVolume, value: vol(50), want: map[string]any{"input": map[string]any{"volume": 50.0}}},
		{name: "output volume above 100", action: ActionSetOutputVolume, value: vol(150), want: map[string]any{"output": map[string]any{"volume": 150.0}}},
		{name: "input volume out of range", action: ActionSetInputVolume, value: vol(150), wantErr: ErrInvalidValue},
		{name: "volume missing", action: ActionSetOutputVolume, wantErr: ErrInvalidValue},
		{name: "unknown action", action: "DANCE", wantErr: ErrInvalidAction},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := controlArgs(tt.action, tt.value, tt.state)
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
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
		"data": map[string]any{"deaf": true, "output": map[string]any{"volume": 120}},
	}))

	select {
	case d := <-updates:
		require.NotNil(t, d.Deaf)
		assert.True(t, *d.Deaf)
		require.NotNil(t, d.OutputVolume)
		assert.Equal(t, 120.0, *d.OutputVolume)
	case <-time.After(time.Second):
		t.Fatal("no state update")
	}
}

func TestControlWithoutConnection(t *testing.T) {
	assert.ErrorIs(t, Control(t.Context(), ActionMute, nil), ErrNotConnected)
}
