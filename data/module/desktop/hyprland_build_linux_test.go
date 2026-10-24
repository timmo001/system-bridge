//go:build linux

package desktop

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/timmo001/system-bridge/types"
)

func TestBuildHyprland(t *testing.T) {
	var state hyprlandState
	replies := []json.RawMessage{
		json.RawMessage(`{"address":"0x2"}`),
		json.RawMessage(`{"id":2,"name":"Terminal"}`),
		json.RawMessage(`[
			{"address":"0x1","mapped":true,"at":[0,24],"size":[800,600],"workspace":{"id":1,"name":"1"},"monitor":0,"class":"firefox","title":"Private","pid":10,"fullscreen":1,"grouped":["0x1"],"swallowing":"0x0","contentType":"video"},
			{"address":"0x2","mapped":true,"workspace":{"id":2,"name":"Terminal"},"monitor":1,"class":"kitty","title":"Shared","pid":20,"fullscreen":3,"contentType":"none"},
			{"address":"0x3","mapped":false,"class":"hidden"}
		]`),
		json.RawMessage(`{"keyboards":[{"name":"usb","layout":"gb,us","active_layout_index":1,"active_keymap":"English (US)","main":true}],"mice":[],"tablets":[],"touch":[],"switches":[{"name":"lid"}]}`),
		json.RawMessage(`{"DP-1":{"levels":{"2":[{"namespace":"bar"}]}}}`),
		json.RawMessage(`[
			{"id":0,"name":"DP-1","activeWorkspace":{"id":1},"specialWorkspace":{"id":-98},"reserved":[1,2,3,4],"directScanoutTo":"0","mirrorOf":"none"},
			{"id":1,"name":"HDMI-A-1","activeWorkspace":{"id":2},"specialWorkspace":{"id":0},"directScanoutTo":"0x5","mirrorOf":"0"}
		]`),
		json.RawMessage(`[{"id":2,"name":"Terminal","monitor":"HDMI-A-1","windows":1},{"id":1,"name":"1","monitor":"DP-1","windows":1,"tiledLayout":"master"}]`),
	}
	require.NoError(t, decodeReplies(replies, state.targets(), 0))

	events := newHyprlandEvents()
	events.handle("urgent", "1")
	assert.True(t, events.handle("screencastv2", "1,1,Shared"))
	assert.True(t, events.handle("screencastv2", "1,0,DP-1"))
	assert.True(t, events.handle("submap", "resize"))

	data := buildHyprland(state, hyprlandConfig{}, events, false)

	assert.Equal(t, types.DesktopCompositorHyprland, data.Compositor)
	assert.Equal(t, "0x2", *data.FocusedWindow)
	assert.Equal(t, "2", *data.FocusedWorkspace)
	assert.Equal(t, "us", *data.Keyboard.Layout)
	assert.Equal(t, []string{"gb", "us"}, data.Keyboard.Layouts)

	require.Len(t, data.Windows, 2)
	first := data.Windows[0]
	assert.Nil(t, first.Title)
	assert.Equal(t, "DP-1", *first.Display)
	assert.True(t, *first.Maximised)
	assert.False(t, *first.Fullscreen)
	assert.True(t, *first.Urgent)
	assert.Equal(t, "video", *first.ContentType)
	assert.True(t, *data.Windows[1].Fullscreen)
	assert.Nil(t, data.Windows[1].ContentType)

	assert.Equal(t, "1", data.Workspaces[0].ID, "workspaces are sorted by ID")
	assert.True(t, data.Workspaces[0].Active)
	assert.True(t, data.Workspaces[1].Focused)

	hyprland := data.Hyprland
	require.NotNil(t, hyprland)
	assert.Equal(t, "resize", *hyprland.Submap)
	assert.Equal(t, types.HyprlandReserved{Left: 1, Top: 2, Right: 3, Bottom: 4}, hyprland.Displays["DP-1"].Reserved)
	assert.Equal(t, "-98", *hyprland.Displays["DP-1"].SpecialWorkspace)
	assert.Equal(t, []string{"bar"}, hyprland.Displays["DP-1"].Layers.Top)
	assert.Equal(t, "DP-1", *hyprland.Displays["HDMI-A-1"].MirrorOf)
	assert.True(t, hyprland.Displays["HDMI-A-1"].DirectScanout)
	assert.Equal(t, []string{"lid"}, hyprland.Switches)
	assert.Equal(t, types.HyprlandFullscreenModeMaximised, hyprland.Windows["0x1"].FullscreenMode)
	assert.Nil(t, hyprland.Windows["0x1"].Swallowing)
	assert.Equal(t, "master", *hyprland.Workspaces["1"].Layout)
	assert.Equal(t, []types.HyprlandScreencast{
		{Type: types.HyprlandScreencastTypeMonitor, Display: pointer("DP-1")},
		{Type: types.HyprlandScreencastTypeWindow, Window: pointer("0x2")},
	}, hyprland.Screencasts)

	assert.Equal(t, "Private", *buildHyprland(state, hyprlandConfig{}, events, true).Windows[0].Title)

	events.handle("activewindowv2", "1")
	events.handle("screencastv2", "0,1,Shared")
	data = buildHyprland(state, hyprlandConfig{}, events, false)
	assert.False(t, *data.Windows[0].Urgent)
	assert.Len(t, data.Hyprland.Screencasts, 1)
}
