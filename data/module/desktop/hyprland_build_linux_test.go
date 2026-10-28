//go:build linux

package desktop

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/timmo001/system-bridge/types"
)

func TestHyprlandBinds(t *testing.T) {
	binds := hyprlandBinds([]hyprlandBind{
		{ModMask: 65, Key: "V", Dispatcher: "__lua", Arg: "12", Description: "Paste"},
		{ModMask: 0, KeyCode: 172, Submap: "resize", Dispatcher: "global", Arg: "omarchy:menu.root"},
	})
	require.Len(t, binds, 2)

	assert.Equal(t, []string{"SUPER", "SHIFT"}, binds[0].Modifiers)
	assert.Equal(t, "V", binds[0].Key)
	assert.Nil(t, binds[0].Dispatcher)
	assert.Nil(t, binds[0].Argument)

	assert.Equal(t, []string{}, binds[1].Modifiers)
	assert.Equal(t, "code:172", binds[1].Key)
	assert.Equal(t, "resize", *binds[1].Submap)
	assert.Equal(t, "omarchy:menu.root", *binds[1].Argument)
}

func TestHyprlandOptionValues(t *testing.T) {
	replies := make([]hyprlandOptionReply, len(hyprlandOptions))
	for i, option := range hyprlandOptions {
		switch option.name {
		case "animations.enabled":
			replies[i].Bool = pointer(false)
		case "decoration.rounding":
			replies[i].Int = pointer(8)
		case "general.gaps_in":
			replies[i].CSS = pointer("5 5 5 5")
		case "general.gaps_out":
			replies[i].CSS = pointer("10 0 10 0")
		}
	}

	byName := map[string]types.HyprlandOption{}
	for _, option := range hyprlandOptionValues(replies) {
		byName[option.Name] = option
	}
	assert.Len(t, byName, 3, "options Hyprland didn't answer are left out")
	assert.False(t, *byName["animations.enabled"].Bool)
	assert.Equal(t, 8, *byName["decoration.rounding"].Int)
	assert.Equal(t, 5, *byName["general.gaps_in"].Int, "the same gap on every side is one number")
	assert.NotContains(t, byName, "general.gaps_out", "gaps that differ by side have no one number")
}

func TestHyprlandOptionValueFormats(t *testing.T) {
	for _, tc := range []struct {
		kind    types.HyprlandOptionType
		value   any
		lua     string
		classic string
	}{
		{types.HyprlandOptionTypeFloat, 0.85, "0.85", "0.85"},
		{types.HyprlandOptionTypeString, `dwin"dle`, `"dwin\"dle"`, `dwin"dle`},
		{types.HyprlandOptionTypeVec2, []any{2.0, -3.0}, `"2 -3"`, "2 -3"},
		{types.HyprlandOptionTypeCSS, 5.0, "5", "5"},
		{types.HyprlandOptionTypeCSS, "5 10", "{ top = 5, right = 10, bottom = 5, left = 10 }", "5 10"},
		{types.HyprlandOptionTypeGradient, "66cccccc rgba(ff0000ff) 45deg", `{ colors = { "0x66cccccc", "rgba(ff0000ff)" }, angle = 45 }`, "0x66cccccc rgba(ff0000ff) 45deg"},
	} {
		lua, err := hyprlandOptionValue(tc.kind, tc.value, true)
		require.NoError(t, err)
		assert.Equal(t, tc.lua, lua)
		classic, err := hyprlandOptionValue(tc.kind, tc.value, false)
		require.NoError(t, err)
		assert.Equal(t, tc.classic, classic)
	}

	_, err := hyprlandOptionValue(types.HyprlandOptionTypeInt, 1.5, true)
	assert.Error(t, err)
	_, err = hyprlandOptionValue(types.HyprlandOptionTypeString, "a\nb", true)
	assert.Error(t, err, "a new line would end the request")
}

func TestBuildHyprland(t *testing.T) {
	var state hyprlandState
	replies := []json.RawMessage{
		json.RawMessage(`{"address":"0x2"}`),
		json.RawMessage(`{"id":2,"name":"Terminal"}`),
		json.RawMessage(`[
			{"address":"0x1","mapped":true,"at":[0,24],"size":[800,600],"workspace":{"id":1,"name":"1"},"monitor":0,"class":"firefox","title":"Private","initialTitle":"Mozilla Firefox","pid":10,"fullscreen":1,"grouped":["0x1"],"swallowing":"0x0","contentType":"video","visible":true,"stableId":"1800004b"},
			{"address":"0x2","mapped":true,"workspace":{"id":2,"name":"Terminal"},"monitor":1,"class":"kitty","title":"Shared","pid":20,"fullscreen":3,"contentType":"none"},
			{"address":"0x3","mapped":false,"class":"hidden"}
		]`),
		json.RawMessage(`{"keyboards":[{"name":"usb","layout":"gb,us","active_layout_index":1,"active_keymap":"English (US)","main":true}],"mice":[],"tablets":[],"touch":[],"switches":[{"name":"lid"}]}`),
		json.RawMessage(`{"DP-1":{"levels":{"2":[{"namespace":"bar"}]}}}`),
		json.RawMessage(`[
			{"id":0,"name":"DP-1","activeWorkspace":{"id":1},"specialWorkspace":{"id":-98},"reserved":[1,2,3,4],"directScanoutTo":"0","mirrorOf":"none"},
			{"id":1,"name":"HDMI-A-1","focused":true,"activeWorkspace":{"id":2},"specialWorkspace":{"id":0},"directScanoutTo":"0x5","mirrorOf":"0"}
		]`),
		json.RawMessage(`[{"id":2,"name":"Terminal","monitor":"HDMI-A-1","windows":1,"lastwindow":"0x0"},{"id":1,"name":"1","monitor":"DP-1","windows":1,"tiledLayout":"master","lastwindow":"0x1"}]`),
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
	assert.Equal(t, "HDMI-A-1", *data.FocusedDisplay)
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
	assert.True(t, hyprland.Windows["0x1"].Visible)
	assert.Equal(t, "1800004b", hyprland.Windows["0x1"].StableID)
	assert.Nil(t, hyprland.Windows["0x1"].InitialTitle, "the initial title is a window title")
	assert.Equal(t, "master", *hyprland.Workspaces["1"].Layout)
	assert.Equal(t, "0x1", *hyprland.Workspaces["1"].LastWindow)
	assert.Nil(t, hyprland.Workspaces["2"].LastWindow)
	assert.Equal(t, []types.HyprlandScreencast{
		{Type: types.HyprlandScreencastTypeMonitor, Display: pointer("DP-1")},
		{Type: types.HyprlandScreencastTypeWindow, Window: pointer("0x2")},
	}, hyprland.Screencasts)

	withTitles := buildHyprland(state, hyprlandConfig{}, events, true)
	assert.Equal(t, "Private", *withTitles.Windows[0].Title)
	assert.Equal(t, "Mozilla Firefox", *withTitles.Hyprland.Windows["0x1"].InitialTitle)

	events.handle("activewindowv2", "1")
	events.handle("screencastv2", "0,1,Shared")
	data = buildHyprland(state, hyprlandConfig{}, events, false)
	assert.False(t, *data.Windows[0].Urgent)
	assert.Len(t, data.Hyprland.Screencasts, 1)
}
