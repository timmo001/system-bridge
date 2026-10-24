//go:build linux

package desktop

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/wayland"
)

func TestWaylandBuild(t *testing.T) {
	const (
		output    = 10
		toplevel  = 0xff000001
		closed    = 0xff000002
		group     = 0xff000003
		workspace = 0xff000004
		hidden    = 0xff000005
	)
	state := newWaylandState()
	state.toplevelManager, state.workspaceManager = 4, 5
	state.outputs[output] = &waylandOutput{}

	states := append(wayland.Uint(toplevelActivated), wayland.Uint(toplevelMaximised)...)
	events := []struct {
		object uint32
		opcode uint16
		args   [][]byte
	}{
		{output, 4, [][]byte{wayland.String("DP-1")}},
		{4, 0, [][]byte{wayland.Uint(toplevel)}},
		{toplevel, 0, [][]byte{wayland.String("Editor")}},
		{toplevel, 1, [][]byte{wayland.String("code")}},
		{toplevel, 2, [][]byte{wayland.Uint(output)}},
		{toplevel, 4, [][]byte{wayland.Uint(uint32(len(states))), states}},
		{4, 0, [][]byte{wayland.Uint(closed)}},
		{closed, 6, nil},
		{5, 0, [][]byte{wayland.Uint(group)}},
		{5, 1, [][]byte{wayland.Uint(workspace)}},
		{5, 1, [][]byte{wayland.Uint(hidden)}},
		{group, 1, [][]byte{wayland.Uint(output)}},
		{group, 3, [][]byte{wayland.Uint(workspace)}},
		{workspace, 1, [][]byte{wayland.String("Main")}},
		{workspace, 3, [][]byte{wayland.Uint(workspaceActive)}},
		{hidden, 3, [][]byte{wayland.Uint(workspaceHidden)}},
	}
	for _, event := range events {
		var body []byte
		for _, arg := range event.args {
			body = append(body, arg...)
		}
		_, err := state.handle(event.object, event.opcode, body)
		require.NoError(t, err)
	}

	data := state.build(false)
	assert.Equal(t, types.DesktopCompositorWayland, data.Compositor)
	require.Len(t, data.Windows, 1)
	window := data.Windows[0]
	assert.Equal(t, "1", window.ID)
	assert.Equal(t, "code", *window.App)
	assert.Nil(t, window.Title, "titles are off")
	assert.Equal(t, "DP-1", *window.Display)
	assert.True(t, window.Focused)
	assert.True(t, *window.Maximised)
	assert.False(t, *window.Fullscreen)
	assert.Equal(t, "1", *data.FocusedWindow)

	require.Len(t, data.Workspaces, 1, "hidden workspaces are left out")
	assert.Equal(t, "Main", *data.Workspaces[0].Name)
	assert.Equal(t, "DP-1", *data.Workspaces[0].Display)
	assert.True(t, data.Workspaces[0].Focused)
	assert.Equal(t, data.Workspaces[0].ID, *data.FocusedWorkspace)

	assert.Equal(t, "Editor", *state.build(true).Windows[0].Title)
}
