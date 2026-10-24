//go:build linux

package desktop

import (
	"context"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// current is the desktop as last reported, for an action to check what it
// names against
func current(ctx context.Context) (*types.DesktopData, error) {
	data, err := Get(ctx)
	if err != nil {
		return nil, err
	}
	if data == nil {
		return nil, ErrUnsupported
	}
	return data, nil
}

func findWindow(data *types.DesktopData, id string) (*types.DesktopWindow, error) {
	for i := range data.Windows {
		if data.Windows[i].ID == id {
			return &data.Windows[i], nil
		}
	}
	return nil, fmt.Errorf("window %q: %w", id, ErrNotFound)
}

func findWorkspace(data *types.DesktopData, id string) (*types.DesktopWorkspace, error) {
	for i := range data.Workspaces {
		if data.Workspaces[i].ID == id {
			return &data.Workspaces[i], nil
		}
	}
	return nil, fmt.Errorf("workspace %q: %w", id, ErrNotFound)
}

// FocusWindow focuses a window, showing its workspace
func FocusWindow(ctx context.Context, id string) error {
	data, err := current(ctx)
	if err != nil {
		return err
	}
	if _, err := findWindow(data, id); err != nil {
		return err
	}
	if data.Compositor == types.DesktopCompositorWayland {
		return waylandSource.activate(id)
	}
	selector := luaString("address:" + id)
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.focus({ window = " + selector + " })",
		classic: "focuswindow address:" + id,
	})
}

// CloseWindow asks a window to close, as its close button would
func CloseWindow(ctx context.Context, id string) error {
	data, err := current(ctx)
	if err != nil {
		return err
	}
	if _, err := findWindow(data, id); err != nil {
		return err
	}
	if data.Compositor == types.DesktopCompositorWayland {
		return waylandSource.close(id)
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.window.close({ window = " + luaString("address:"+id) + " })",
		classic: "closewindow address:" + id,
	})
}

// SetWindowState makes a window fullscreen, maximised or minimised, or not
func SetWindowState(ctx context.Context, id string, state WindowState) error {
	data, err := current(ctx)
	if err != nil {
		return err
	}
	if _, err := findWindow(data, id); err != nil {
		return err
	}
	if data.Compositor == types.DesktopCompositorWayland {
		return waylandSource.setState(id, state)
	}

	// Hyprland has no minimised windows
	if state.Minimised != nil {
		return fmt.Errorf("minimising windows: %w", ErrUnsupported)
	}
	// The classic fullscreen dispatcher only acts on the focused window
	focus := hyprlandCommand{classic: "focuswindow address:" + id}
	var commands []hyprlandCommand
	for _, mode := range []struct {
		set     *bool
		lua     string
		classic string
	}{
		{state.Fullscreen, "fullscreen", "0"},
		{state.Maximised, "maximized", "1"},
	} {
		if mode.set == nil {
			continue
		}
		action := "unset"
		if *mode.set {
			action = "set"
		}
		if len(commands) == 0 {
			commands = append(commands, focus)
		}
		commands = append(commands, hyprlandCommand{
			lua:     "hl.dsp.window.fullscreen({ mode = " + luaString(mode.lua) + ", action = " + luaString(action) + ", window = " + luaString("address:"+id) + " })",
			classic: "fullscreen " + mode.classic + " " + action,
		})
	}
	return hyprlandDispatch(ctx, data, commands...)
}

// FocusWorkspace shows a workspace and focuses it
func FocusWorkspace(ctx context.Context, id string) error {
	data, err := current(ctx)
	if err != nil {
		return err
	}
	workspace, err := findWorkspace(data, id)
	if err != nil {
		return err
	}
	if data.Compositor == types.DesktopCompositorWayland {
		return waylandSource.activateWorkspace(id)
	}

	// Special workspaces are toggled by name, as they show over another one
	if workspace.Special != nil && *workspace.Special && workspace.Name != nil {
		name := strings.TrimPrefix(*workspace.Name, "special:")
		return hyprlandDispatch(ctx, data, hyprlandCommand{
			lua:     "hl.dsp.workspace.toggle_special(" + luaString(name) + ")",
			classic: "togglespecialworkspace " + name,
		})
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.focus({ workspace = " + luaString(id) + " })",
		classic: "workspace " + id,
	})
}

// SetKeyboardLayout switches the keyboard to one of its layouts
func SetKeyboardLayout(ctx context.Context, layout string) error {
	data, err := current(ctx)
	if err != nil {
		return err
	}
	if data.Compositor != types.DesktopCompositorHyprland {
		return fmt.Errorf("switching keyboard layouts: %w", ErrUnsupported)
	}
	index := slices.Index(data.Keyboard.Layouts, layout)
	if index == -1 {
		return fmt.Errorf("keyboard layout %q: %w", layout, ErrNotFound)
	}
	// A request rather than a dispatcher, so the same with either config
	return hyprlandSend(ctx, "switchxkblayout current "+strconv.Itoa(index))
}

// HyprlandMoveWindow moves a window to a workspace, leaving the focus where
// it is. The workspace is one listed, or the number of a new one.
func HyprlandMoveWindow(ctx context.Context, id string, workspace string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if _, err := findWindow(data, id); err != nil {
		return err
	}
	target := workspace
	if listed, err := findWorkspace(data, workspace); err == nil {
		if listed.Special != nil && *listed.Special && listed.Name != nil {
			target = *listed.Name
		}
	} else if number, err := strconv.Atoi(workspace); err != nil || number < 1 {
		return fmt.Errorf("workspace %q: %w", workspace, ErrNotFound)
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.window.move({ workspace = " + luaString(target) + ", follow = false, window = " + luaString("address:"+id) + " })",
		classic: "movetoworkspacesilent " + target + ",address:" + id,
	})
}

// HyprlandSetWindow floats or tiles a window, and pins or unpins it
func HyprlandSetWindow(ctx context.Context, id string, settings HyprlandWindowSettings) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if _, err := findWindow(data, id); err != nil {
		return err
	}
	selector := luaString("address:" + id)
	var commands []hyprlandCommand
	if settings.Floating != nil {
		action, classic := "off", "settiled"
		if *settings.Floating {
			action, classic = "on", "setfloating"
		}
		commands = append(commands, hyprlandCommand{
			lua:     "hl.dsp.window.float({ action = " + luaString(action) + ", window = " + selector + " })",
			classic: classic + " address:" + id,
		})
	}
	// The classic pin dispatcher only toggles
	if settings.Pinned != nil && *settings.Pinned != data.Hyprland.Windows[id].Pinned {
		action := "off"
		if *settings.Pinned {
			action = "on"
		}
		pin := hyprlandCommand{
			lua:     "hl.dsp.window.pin({ action = " + luaString(action) + ", window = " + selector + " })",
			classic: "pin address:" + id,
		}
		// Only floating windows can be pinned, so a window is floated before
		// it's pinned, and unpinned before it's tiled
		if *settings.Pinned {
			commands = append(commands, pin)
		} else {
			commands = append([]hyprlandCommand{pin}, commands...)
		}
	}
	return hyprlandDispatch(ctx, data, commands...)
}

// HyprlandRunGlobalShortcut triggers a global shortcut an app registered, as
// a bind to it would
func HyprlandRunGlobalShortcut(ctx context.Context, name string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if !slices.ContainsFunc(data.Hyprland.GlobalShortcuts, func(shortcut types.HyprlandGlobalShortcut) bool {
		return shortcut.Name == name
	}) {
		return fmt.Errorf("global shortcut %q: %w", name, ErrNotFound)
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.global(" + luaString(name) + ")",
		classic: "global " + name,
	})
}

// HyprlandReloadConfig reloads Hyprland's config
func HyprlandReloadConfig(ctx context.Context) error {
	if _, err := hyprlandCurrent(ctx); err != nil {
		return err
	}
	return hyprlandSend(ctx, "reload")
}

func hyprlandCurrent(ctx context.Context) (*types.DesktopData, error) {
	data, err := current(ctx)
	if err != nil {
		return nil, err
	}
	if data.Hyprland == nil {
		return nil, fmt.Errorf("Hyprland isn't running: %w", ErrUnsupported)
	}
	return data, nil
}

// hyprlandCommand is a dispatch, written for a Lua config and for a classic
// one. Without a Lua form, it's only needed with a classic config.
type hyprlandCommand struct {
	lua     string
	classic string
}

// hyprlandDispatch sends dispatches in the form the running config takes
func hyprlandDispatch(ctx context.Context, data *types.DesktopData, commands ...hyprlandCommand) error {
	provider := data.Hyprland.Version.ConfigProvider
	lua := provider != nil && *provider == "lua"
	for _, command := range commands {
		dispatch := command.classic
		if lua {
			dispatch = command.lua
		}
		if dispatch == "" {
			continue
		}
		if err := hyprlandSend(ctx, "dispatch "+dispatch); err != nil {
			return err
		}
	}
	return nil
}

// hyprlandSend sends a request that replies ok
func hyprlandSend(ctx context.Context, request string) error {
	dir, err := hyprlandDir()
	if err != nil {
		return err
	}
	reply, err := hyprlandRequest(ctx, dir, "/"+request)
	if err != nil {
		return err
	}
	if text := strings.TrimSpace(string(reply)); text != "ok" {
		return fmt.Errorf("Hyprland refused %q: %s", request, text)
	}
	return nil
}

// luaString quotes a string for Lua
func luaString(value string) string {
	var quoted strings.Builder
	quoted.WriteByte('"')
	for i := 0; i < len(value); i++ {
		switch c := value[i]; {
		case c == '"' || c == '\\':
			quoted.WriteByte('\\')
			quoted.WriteByte(c)
		case c < 0x20 || c == 0x7f:
			fmt.Fprintf(&quoted, "\\%03d", c)
		default:
			quoted.WriteByte(c)
		}
	}
	quoted.WriteByte('"')
	return quoted.String()
}
