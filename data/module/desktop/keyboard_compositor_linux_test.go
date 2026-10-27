//go:build linux

package desktop

import (
	"bufio"
	"bytes"
	"net"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// swayInputs is GET_INPUTS' reply in the shape Sway sends, trimmed
const swayInputs = `[
  {"identifier": "1:1:AT_Translated_Set_2_keyboard", "name": "AT Translated Set 2 keyboard", "type": "keyboard",
   "xkb_layout_names": ["English (UK)", "English (US)"], "xkb_active_layout_index": 1, "xkb_active_layout_name": "English (US)"},
  {"identifier": "1267:12377:ELAN1300:00_04F3:3057_Touchpad", "type": "touchpad"}
]`

func TestParseSwayInputs(t *testing.T) {
	names, active, err := parseSwayInputs([]byte(swayInputs))
	require.NoError(t, err)
	assert.Equal(t, []string{"English (UK)", "English (US)"}, names)
	assert.Equal(t, 1, active)

	_, _, err = parseSwayInputs([]byte(`[{"type": "pointer"}]`))
	assert.Error(t, err)
}

func TestSwayLayoutChanged(t *testing.T) {
	tests := []struct {
		payload string
		want    bool
	}{
		{`{"change": "xkb_layout", "input": {"type": "keyboard"}}`, true},
		{`{"change": "xkb_keymap"}`, true},
		{`{"change": "added"}`, true},
		{`{"change": "libinput_config"}`, false},
		{`not json`, false},
	}
	for _, tt := range tests {
		assert.Equal(t, tt.want, swayLayoutChanged([]byte(tt.payload)), tt.payload)
	}
}

func TestNiriReplies(t *testing.T) {
	var ok struct {
		KeyboardLayouts struct {
			Names      []string `json:"names"`
			CurrentIdx int      `json:"current_idx"`
		} `json:"KeyboardLayouts"`
	}
	require.NoError(t, parseNiriReply([]byte(`{"Ok":{"KeyboardLayouts":{"names":["English (UK)","German"],"current_idx":1}}}`), &ok))
	assert.Equal(t, []string{"English (UK)", "German"}, ok.KeyboardLayouts.Names)
	assert.Equal(t, 1, ok.KeyboardLayouts.CurrentIdx)

	assert.NoError(t, parseNiriReply([]byte(`{"Ok":"Handled"}`), nil))
	assert.EqualError(t, parseNiriReply([]byte(`{"Err":"layout index out of range"}`), nil), "niri: layout index out of range")

	assert.True(t, niriLayoutChanged([]byte(`{"KeyboardLayoutSwitched":{"idx":0}}`)))
	assert.True(t, niriLayoutChanged([]byte(`{"KeyboardLayoutsChanged":{"keyboard_layouts":{"names":["English (UK)"],"current_idx":0}}}`)))
	assert.False(t, niriLayoutChanged([]byte(`{"WorkspaceActivated":{"id":2,"focused":true}}`)))
}

// fakeSocket answers each connection to a unix socket with serve
func fakeSocket(t *testing.T, serve func(conn net.Conn)) string {
	t.Helper()
	socket := filepath.Join(t.TempDir(), "ipc.sock")
	listener, err := net.Listen("unix", socket)
	require.NoError(t, err)
	t.Cleanup(func() { _ = listener.Close() })
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			go func() {
				defer func() { _ = conn.Close() }()
				serve(conn)
			}()
		}
	}()
	return socket
}

func TestSwayIPC(t *testing.T) {
	var commands []string
	socket := fakeSocket(t, func(conn net.Conn) {
		messageType, payload, err := readSwayMessage(conn)
		if err != nil {
			return
		}
		switch messageType {
		case swayGetInputs:
			_, _ = conn.Write(swayMessage(swayGetInputs, []byte(swayInputs)))
		case swayRunCommand:
			commands = append(commands, string(payload))
			_, _ = conn.Write(swayMessage(swayRunCommand, []byte(`[{"success": true}]`)))
		}
	})
	ipc := swayIPC{socket: socket}

	names, active, err := ipc.layouts(t.Context())
	require.NoError(t, err)
	assert.Equal(t, []string{"English (UK)", "English (US)"}, names)
	assert.Equal(t, 1, active)

	require.NoError(t, ipc.switchTo(t.Context(), 0))
	assert.Equal(t, []string{"input type:keyboard xkb_switch_layout 0"}, commands)
}

func TestNiriIPC(t *testing.T) {
	var requests []string
	socket := fakeSocket(t, func(conn net.Conn) {
		line, err := bufio.NewReader(conn).ReadBytes('\n')
		if err != nil {
			return
		}
		requests = append(requests, string(bytes.TrimSpace(line)))
		if bytes.Contains(line, []byte("SwitchLayout")) {
			_, _ = conn.Write([]byte(`{"Ok":"Handled"}` + "\n"))
			return
		}
		_, _ = conn.Write([]byte(`{"Ok":{"KeyboardLayouts":{"names":["English (UK)","German"],"current_idx":0}}}` + "\n"))
	})
	ipc := niriIPC{socket: socket}

	names, active, err := ipc.layouts(t.Context())
	require.NoError(t, err)
	assert.Equal(t, []string{"English (UK)", "German"}, names)
	assert.Equal(t, 0, active)

	require.NoError(t, ipc.switchTo(t.Context(), 1))
	assert.Equal(t, []string{
		`"KeyboardLayouts"`,
		`{"Action":{"SwitchLayout":{"layout":{"Index":1}}}}`,
	}, requests)
}
