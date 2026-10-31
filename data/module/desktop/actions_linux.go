//go:build linux

package desktop

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
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
	index := slices.Index(data.Keyboard.Layouts, layout)
	if data.Compositor == types.DesktopCompositorHyprland {
		if index == -1 {
			return fmt.Errorf("keyboard layout %q: %w", layout, ErrNotFound)
		}
		// A request rather than a dispatcher, so the same with either config
		return hyprlandSend(ctx, "switchxkblayout current "+strconv.Itoa(index))
	}

	// Sway and niri, through their own IPC
	ipc := compositorLayouts()
	if ipc == nil {
		return fmt.Errorf("switching keyboard layouts: %w", ErrUnsupported)
	}
	if index == -1 {
		return fmt.Errorf("keyboard layout %q: %w", layout, ErrNotFound)
	}
	return ipc.switchTo(ctx, index)
}

// hyprlandDirections are Hyprland's names for each direction
var hyprlandDirections = map[types.HyprlandDirection]string{
	types.HyprlandDirectionDown:  "d",
	types.HyprlandDirectionLeft:  "l",
	types.HyprlandDirectionRight: "r",
	types.HyprlandDirectionUp:    "u",
}

// HyprlandDispatch runs one of the named dispatchers on the focused window,
// as its bind would, or on the window with id, focusing it first. Moving
// focus and swapping take a direction.
func HyprlandDispatch(ctx context.Context, dispatcher types.HyprlandDispatcher, direction types.HyprlandDirection, id string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	var commands []hyprlandCommand
	// Not every classic dispatcher takes a window, so the window is focused
	// as a bind would find it
	if id != "" {
		if _, err := findWindow(data, id); err != nil {
			return err
		}
		commands = append(commands, hyprlandCommand{
			lua:     "hl.dsp.focus({ window = " + luaString("address:"+id) + " })",
			classic: "focuswindow address:" + id,
		})
	}
	var command hyprlandCommand
	switch dispatcher {
	case types.HyprlandDispatcherCenterWindow:
		command = hyprlandCommand{lua: "hl.dsp.window.center()", classic: "centerwindow"}
	case types.HyprlandDispatcherCycleNextWindow:
		command = hyprlandCommand{lua: "hl.dsp.window.cycle_next()", classic: "cyclenext"}
	case types.HyprlandDispatcherCyclePreviousWindow:
		command = hyprlandCommand{lua: "hl.dsp.window.cycle_next({ next = false })", classic: "cyclenext prev"}
	case types.HyprlandDispatcherMoveFocus, types.HyprlandDispatcherSwapWindow:
		short, ok := hyprlandDirections[direction]
		if !ok {
			return fmt.Errorf("direction %q: %w", direction, ErrNotFound)
		}
		if dispatcher == types.HyprlandDispatcherMoveFocus {
			command = hyprlandCommand{lua: "hl.dsp.focus({ direction = " + luaString(short) + " })", classic: "movefocus " + short}
		} else {
			command = hyprlandCommand{lua: "hl.dsp.window.swap({ direction = " + luaString(short) + " })", classic: "swapwindow " + short}
		}
	case types.HyprlandDispatcherGroupNext:
		command = hyprlandCommand{lua: "hl.dsp.group.next()", classic: "changegroupactive f"}
	case types.HyprlandDispatcherGroupPrevious:
		command = hyprlandCommand{lua: "hl.dsp.group.prev()", classic: "changegroupactive b"}
	case types.HyprlandDispatcherLockGroup, types.HyprlandDispatcherUnlockGroup:
		action, classic := `"on"`, "lockactivegroup lock"
		if dispatcher == types.HyprlandDispatcherUnlockGroup {
			action, classic = `"off"`, "lockactivegroup unlock"
		}
		// Hyprland 0.57 deprecates group.lock_active, as group.lock now
		// locks the active group. TODO(Omarchy): drop the 0.56 form once
		// Omarchy ships Hyprland 0.57.
		lua := "hl.dsp.group.lock_active({ action = " + action + " })"
		if hyprlandAtLeast(data, 0, 57) {
			lua = "hl.dsp.group.lock({ action = " + action + " })"
		}
		command = hyprlandCommand{lua: lua, classic: classic}
	case types.HyprlandDispatcherLockGroups, types.HyprlandDispatcherUnlockGroups:
		action, classic := `"on"`, "lockgroups lock"
		if dispatcher == types.HyprlandDispatcherUnlockGroups {
			action, classic = `"off"`, "lockgroups unlock"
		}
		// group.lock locks every group before Hyprland 0.57, which needs all.
		// TODO(Omarchy): drop the 0.56 form once Omarchy ships Hyprland 0.57.
		lua := "hl.dsp.group.lock({ action = " + action + " })"
		if hyprlandAtLeast(data, 0, 57) {
			lua = "hl.dsp.group.lock({ action = " + action + ", all = true })"
		}
		command = hyprlandCommand{lua: lua, classic: classic}
	case types.HyprlandDispatcherToggleGroup:
		command = hyprlandCommand{lua: "hl.dsp.group.toggle()", classic: "togglegroup"}
	case types.HyprlandDispatcherToggleSplit:
		command = hyprlandCommand{lua: `hl.dsp.layout("togglesplit")`, classic: "layoutmsg togglesplit"}
	default:
		return fmt.Errorf("dispatcher %q: %w", dispatcher, ErrNotFound)
	}
	return hyprlandDispatch(ctx, data, append(commands, command)...)
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
	// Sized and placed after it floats, as Hyprland only puts a floating
	// window exactly where it's asked. Resizing keeps the window's centre, so
	// it's resized before it's moved.
	if settings.Width != nil && settings.Height != nil {
		width, height := strconv.Itoa(*settings.Width), strconv.Itoa(*settings.Height)
		commands = append(commands, hyprlandCommand{
			lua:     "hl.dsp.window.resize({ x = " + width + ", y = " + height + ", window = " + selector + " })",
			classic: "resizewindowpixel exact " + width + " " + height + ",address:" + id,
		})
	}
	if settings.X != nil && settings.Y != nil {
		x, y := strconv.Itoa(*settings.X), strconv.Itoa(*settings.Y)
		commands = append(commands, hyprlandCommand{
			lua:     "hl.dsp.window.move({ x = " + x + ", y = " + y + ", window = " + selector + " })",
			classic: "movewindowpixel exact " + x + " " + y + ",address:" + id,
		})
	}
	return hyprlandDispatch(ctx, data, commands...)
}

// HyprlandKillWindow forces a window's app off the window, rather than
// asking it to close
func HyprlandKillWindow(ctx context.Context, id string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if _, err := findWindow(data, id); err != nil {
		return err
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.window.kill({ window = " + luaString("address:"+id) + " })",
		classic: "killwindow address:" + id,
	})
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

// HyprlandRenameWorkspace names a workspace, or gives it back its default
// name, its ID, with an empty name. Hyprland leaves a workspace renamed
// without a name with none.
func HyprlandRenameWorkspace(ctx context.Context, id string, name string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if _, err := findWorkspace(data, id); err != nil {
		return err
	}
	if name == "" {
		name = id
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.workspace.rename({ workspace = " + luaString(id) + ", name = " + luaString(name) + " })",
		classic: "renameworkspace " + id + " " + name,
	})
}

// HyprlandMoveWorkspace moves a workspace to another display
func HyprlandMoveWorkspace(ctx context.Context, id string, display string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if _, err := findWorkspace(data, id); err != nil {
		return err
	}
	if _, ok := data.Hyprland.Displays[display]; !ok {
		return fmt.Errorf("display %q: %w", display, ErrNotFound)
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.workspace.move({ workspace = " + luaString(id) + ", monitor = " + luaString(display) + " })",
		classic: "moveworkspacetomonitor " + id + " " + display,
	})
}

// HyprlandSetSubmap switches binds to a submap one of them names, or back to
// the default with an empty name
func HyprlandSetSubmap(ctx context.Context, name string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	target := "reset"
	if name != "" {
		if !slices.ContainsFunc(data.Hyprland.Binds, func(bind types.HyprlandBind) bool {
			return bind.Submap != nil && *bind.Submap == name
		}) {
			return fmt.Errorf("submap %q: %w", name, ErrNotFound)
		}
		target = name
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.submap(" + luaString(target) + ")",
		classic: "submap " + target,
	})
}

var hyprlandOptionName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$`)

// hyprlandUsesLua is whether the running config is Lua rather than classic
func hyprlandUsesLua(data *types.DesktopData) bool {
	provider := data.Hyprland.Version.ConfigProvider
	return provider != nil && *provider == "lua"
}

// hyprlandAtLeast is whether the running Hyprland is major.minor or newer.
// An unknown version counts as older.
func hyprlandAtLeast(data *types.DesktopData, major int, minor int) bool {
	parts := strings.SplitN(strings.TrimPrefix(data.Hyprland.Version.Version, "v"), ".", 3)
	if len(parts) < 2 {
		return false
	}
	gotMajor, majorErr := strconv.Atoi(parts[0])
	gotMinor, minorErr := strconv.Atoi(parts[1])
	if majorErr != nil || minorErr != nil {
		return false
	}
	return gotMajor > major || gotMajor == major && gotMinor >= minor
}

// HyprlandGetOption reads any config option by name, such as
// general.col.active_border or general:layout
func HyprlandGetOption(ctx context.Context, name string) (*types.HyprlandOptionValue, error) {
	if _, err := hyprlandCurrent(ctx); err != nil {
		return nil, err
	}
	dir, err := hyprlandDir()
	if err != nil {
		return nil, err
	}
	name = strings.ReplaceAll(name, ":", ".")
	// The name goes into Lua as it is when setting the option
	if !hyprlandOptionName.MatchString(name) {
		return nil, fmt.Errorf("option %q: %w", name, ErrNotFound)
	}
	// The classic name, which getoption takes with either config
	reply, err := hyprlandRequest(ctx, dir, "j/getoption "+strings.ReplaceAll(name, ".", ":"))
	if err != nil {
		return nil, err
	}
	var option hyprlandGetOptionReply
	if err := json.Unmarshal(reply, &option); err != nil {
		if text := strings.TrimSpace(string(reply)); text == "no such option" {
			return nil, fmt.Errorf("option %q: %w", name, ErrNotFound)
		}
		return nil, fmt.Errorf("reading option %q: %s", name, strings.TrimSpace(string(reply)))
	}
	return option.value(name), nil
}

// hyprlandGetOptionReply is getoption's reply, keyed by the option's type
type hyprlandGetOptionReply struct {
	Set      bool      `json:"set"`
	Bool     *bool     `json:"bool"`
	Int      *int      `json:"int"`
	Float    *float64  `json:"float"`
	Str      *string   `json:"str"`
	CSS      *string   `json:"css"`
	Gradient *string   `json:"gradient"`
	Vec2     []float64 `json:"vec2"`
	Custom   *string   `json:"custom"`
}

func (r hyprlandGetOptionReply) value(name string) *types.HyprlandOptionValue {
	value := &types.HyprlandOptionValue{Name: name, Set: r.Set, Vec2: []float64{}}
	switch {
	case r.Bool != nil:
		value.Type, value.Bool = types.HyprlandOptionTypeBool, r.Bool
	case r.Int != nil:
		value.Type, value.Int = types.HyprlandOptionTypeInt, r.Int
	case r.Float != nil:
		value.Type, value.Float = types.HyprlandOptionTypeFloat, r.Float
	case r.Str != nil:
		value.Type, value.String = types.HyprlandOptionTypeString, r.Str
	case r.CSS != nil:
		value.Type, value.String = types.HyprlandOptionTypeCSS, r.CSS
	case r.Gradient != nil:
		value.Type, value.String = types.HyprlandOptionTypeGradient, r.Gradient
	case r.Vec2 != nil:
		value.Type, value.Vec2 = types.HyprlandOptionTypeVec2, r.Vec2
	default:
		value.Type, value.String = types.HyprlandOptionTypeCustom, r.Custom
	}
	return value
}

// HyprlandSetOption sets any config option until the config reloads. value
// is a bool, a number or text, by the option's type. The options in
// hyprlandOptions only take a whole number of 0 or more for a number.
func HyprlandSetOption(ctx context.Context, name string, value any) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	current, err := HyprlandGetOption(ctx, name)
	if err != nil {
		return err
	}
	name = current.Name
	kind := current.Type
	lua := hyprlandUsesLua(data)
	text, err := hyprlandOptionValue(kind, value, lua)
	// Sizes such as the gaps are listed as numbers, though Hyprland reads
	// them as CSS
	if err == nil && strings.Contains(text, "-") && slices.ContainsFunc(hyprlandOptions, func(option hyprlandOption) bool {
		return option.name == name && option.kind == types.HyprlandOptionTypeInt
	}) {
		err = errors.New("the value must be a whole number, 0 or more")
	}
	if err != nil {
		return fmt.Errorf("option %q: %w: %w", name, ErrInvalidValue, err)
	}

	request := "keyword " + strings.ReplaceAll(name, ".", ":") + " " + text
	if lua {
		// hl.config({ animations = { enabled = false } })
		parts := strings.Split(name, ".")
		config := parts[len(parts)-1] + " = " + text
		for i := len(parts) - 2; i >= 0; i-- {
			config = parts[i] + " = { " + config + " }"
		}
		request = "eval hl.config({ " + config + " })"
	}
	if err := hyprlandSend(ctx, request); err != nil {
		return err
	}
	hyprlandSource.forgetConfig()
	return nil
}

// hyprlandOptionValue checks a value against an option's type and writes it
// as the running config language takes it
func hyprlandOptionValue(kind types.HyprlandOptionType, value any, lua bool) (string, error) {
	switch kind {
	case types.HyprlandOptionTypeBool:
		switch value := value.(type) {
		case bool:
			return strconv.FormatBool(value), nil
		case string:
			if parsed, err := strconv.ParseBool(value); err == nil {
				return strconv.FormatBool(parsed), nil
			}
		}
		return "", errors.New("the value must be true or false")
	case types.HyprlandOptionTypeInt:
		number, ok := optionNumber(value)
		if !ok || number != math.Trunc(number) {
			return "", errors.New("the value must be a whole number")
		}
		return strconv.Itoa(int(number)), nil
	case types.HyprlandOptionTypeFloat:
		number, ok := optionNumber(value)
		if !ok {
			return "", errors.New("the value must be a number")
		}
		return strconv.FormatFloat(number, 'f', -1, 64), nil
	case types.HyprlandOptionTypeVec2:
		var parts []string
		switch value := value.(type) {
		case string:
			parts = strings.Fields(value)
		case []any:
			for _, part := range value {
				number, ok := optionNumber(part)
				if !ok {
					return "", errors.New("the value must be two numbers")
				}
				parts = append(parts, strconv.FormatFloat(number, 'f', -1, 64))
			}
		}
		if len(parts) != 2 {
			return "", errors.New("the value must be two numbers, such as \"5 10\"")
		}
		for _, part := range parts {
			if _, err := strconv.ParseFloat(part, 64); err != nil {
				return "", errors.New("the value must be two numbers, such as \"5 10\"")
			}
		}
		if lua {
			return luaString(parts[0] + " " + parts[1]), nil
		}
		return parts[0] + " " + parts[1], nil
	case types.HyprlandOptionTypeCSS:
		return hyprlandCSSValue(value, lua)
	case types.HyprlandOptionTypeGradient:
		text, ok := value.(string)
		if !ok {
			return "", errors.New("the value must be colours and an optional angle, such as \"ff33ccff 45deg\"")
		}
		return hyprlandGradientValue(text, lua)
	case types.HyprlandOptionTypeString, types.HyprlandOptionTypeCustom:
		var text string
		switch value := value.(type) {
		case string:
			text = value
		case bool:
			text = strconv.FormatBool(value)
		case float64:
			text = strconv.FormatFloat(value, 'f', -1, 64)
		default:
			return "", errors.New("the value must be text")
		}
		if strings.ContainsAny(text, "\n\r") {
			return "", errors.New("the value must be one line")
		}
		if lua {
			return luaString(text), nil
		}
		return text, nil
	}
	return "", fmt.Errorf("unknown option type %q", kind)
}

// optionNumber is a value as a number, from a number or its text
func optionNumber(value any) (float64, bool) {
	switch value := value.(type) {
	case float64:
		return value, true
	case int:
		return float64(value), true
	case string:
		number, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
		return number, err == nil && !math.IsNaN(number) && !math.IsInf(number, 0)
	}
	return 0, false
}

// hyprlandCSSValue writes sizes for each side, from one number or up to four
// in CSS order, such as "5 10 5 10". Lua takes them as a table.
func hyprlandCSSValue(value any, lua bool) (string, error) {
	var sides []string
	switch value := value.(type) {
	case string:
		sides = strings.Fields(value)
	default:
		number, ok := optionNumber(value)
		if !ok {
			return "", errors.New("the value must be up to four whole numbers, such as \"5 10\"")
		}
		sides = []string{strconv.FormatFloat(number, 'f', -1, 64)}
	}
	if len(sides) == 0 || len(sides) > 4 {
		return "", errors.New("the value must be up to four whole numbers, such as \"5 10\"")
	}
	for _, side := range sides {
		if _, err := strconv.Atoi(side); err != nil {
			return "", errors.New("the value must be up to four whole numbers, such as \"5 10\"")
		}
	}
	if !lua {
		return strings.Join(sides, " "), nil
	}
	if len(sides) == 1 {
		return sides[0], nil
	}
	// As CSS spreads them: top, right, bottom and left
	for len(sides) < 4 {
		sides = append(sides, sides[len(sides)-2])
	}
	return "{ top = " + sides[0] + ", right = " + sides[1] + ", bottom = " + sides[2] + ", left = " + sides[3] + " }", nil
}

// hyprlandGradientValue writes colours and an optional angle, as getoption
// reports them, such as "ff33ccff 00ff99ee 45deg". getoption gives colours as
// bare ARGB hex, which the configs take with 0x.
func hyprlandGradientValue(text string, lua bool) (string, error) {
	var colours []string
	angle := ""
	for _, part := range strings.Fields(text) {
		if degrees, ok := strings.CutSuffix(part, "deg"); ok {
			if _, err := strconv.ParseFloat(degrees, 64); err != nil || angle != "" {
				return "", fmt.Errorf("angle %q: must be one number of degrees, such as 45deg", part)
			}
			angle = degrees
			continue
		}
		if len(part) == 8 || len(part) == 6 {
			if _, err := strconv.ParseUint(part, 16, 32); err == nil {
				part = "0x" + part
			}
		}
		colours = append(colours, part)
	}
	if len(colours) == 0 {
		return "", errors.New("the value must have at least one colour")
	}
	if !lua {
		if angle != "" {
			return strings.Join(colours, " ") + " " + angle + "deg", nil
		}
		return strings.Join(colours, " "), nil
	}
	quoted := make([]string, len(colours))
	for i, colour := range colours {
		quoted[i] = luaString(colour)
	}
	gradient := "{ colors = { " + strings.Join(quoted, ", ") + " }"
	if angle != "" {
		gradient += ", angle = " + angle
	}
	return gradient + " }", nil
}

// HyprlandCursorPosition is where the pointer is, across every display
func HyprlandCursorPosition(ctx context.Context) (*types.HyprlandCursorPosition, error) {
	if _, err := hyprlandCurrent(ctx); err != nil {
		return nil, err
	}
	dir, err := hyprlandDir()
	if err != nil {
		return nil, err
	}
	reply, err := hyprlandRequest(ctx, dir, "j/cursorpos")
	if err != nil {
		return nil, err
	}
	var position types.HyprlandCursorPosition
	if err := json.Unmarshal(reply, &position); err != nil {
		return nil, fmt.Errorf("reading the cursor position: %w", err)
	}
	return &position, nil
}

// HyprlandLog is the end of Hyprland's log. It reads the text form, as the
// JSON one isn't valid JSON.
func HyprlandLog(ctx context.Context) (*types.HyprlandLog, error) {
	if _, err := hyprlandCurrent(ctx); err != nil {
		return nil, err
	}
	dir, err := hyprlandDir()
	if err != nil {
		return nil, err
	}
	reply, err := hyprlandRequest(ctx, dir, "/rollinglog")
	if err != nil {
		return nil, err
	}
	lines := []string{}
	for line := range strings.SplitSeq(string(reply), "\n") {
		if line = strings.TrimRight(line, "\r"); strings.TrimSpace(line) != "" {
			lines = append(lines, line)
		}
	}
	return &types.HyprlandLog{Lines: lines}, nil
}

// HyprlandMoveCursor moves the pointer to a position across every display
func HyprlandMoveCursor(ctx context.Context, x int, y int) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.cursor.move({ x = " + strconv.Itoa(x) + ", y = " + strconv.Itoa(y) + " })",
		classic: "movecursor " + strconv.Itoa(x) + " " + strconv.Itoa(y),
	})
}

// HyprlandSendEvent sends a custom event, as a bind to the event dispatcher
// would. Listeners, such as System Bridge's own Hyprland events, get it.
func HyprlandSendEvent(ctx context.Context, name string) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if strings.ContainsAny(name, "\n\r") {
		return fmt.Errorf("event %q: %w: must be one line", name, ErrInvalidValue)
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.event(" + luaString(name) + ")",
		classic: "event " + name,
	})
}

// hyprlandCodeCurrent is the desktop, when running code through Hyprland is
// turned on in the settings
func hyprlandCodeCurrent(ctx context.Context) (*types.DesktopData, error) {
	if !hyprlandCodeEnabled() {
		return nil, ErrNotAllowed
	}
	return hyprlandCurrent(ctx)
}

// HyprlandExec runs a command through Hyprland, as a bind to exec would, so
// it starts in Hyprland's environment
func HyprlandExec(ctx context.Context, command string) error {
	data, err := hyprlandCodeCurrent(ctx)
	if err != nil {
		return err
	}
	if strings.ContainsAny(command, "\n\r") {
		return fmt.Errorf("command: %w: must be one line", ErrInvalidValue)
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.exec_cmd(" + luaString(command) + ")",
		classic: "exec " + command,
	})
}

// HyprlandDispatchRaw runs any dispatch as the running config writes it: Lua,
// such as hl.dsp.focus({ workspace = "2" }), or classic, such as workspace 2
func HyprlandDispatchRaw(ctx context.Context, dispatch string) error {
	if _, err := hyprlandCodeCurrent(ctx); err != nil {
		return err
	}
	if strings.ContainsAny(dispatch, "\n\r") {
		return fmt.Errorf("dispatch: %w: must be one line", ErrInvalidValue)
	}
	return hyprlandSend(ctx, "dispatch "+dispatch)
}

// HyprlandEval runs Lua in Hyprland. Only a Lua config takes it.
func HyprlandEval(ctx context.Context, code string) error {
	data, err := hyprlandCodeCurrent(ctx)
	if err != nil {
		return err
	}
	if !hyprlandUsesLua(data) {
		return fmt.Errorf("running Lua without a Lua config: %w", ErrUnsupported)
	}
	if strings.ContainsAny(code, "\n\r") {
		return fmt.Errorf("code: %w: must be one line", ErrInvalidValue)
	}
	err = hyprlandSend(ctx, "eval "+code)
	// Lua can change the config, so read it again
	hyprlandSource.forgetConfig()
	return err
}

// HyprlandReloadConfig reloads Hyprland's config
func HyprlandReloadConfig(ctx context.Context) error {
	if _, err := hyprlandCurrent(ctx); err != nil {
		return err
	}
	return hyprlandSend(ctx, "reload")
}

// HyprlandMonitor is an enabled display's state in Hyprland: whether it's on,
// and its current mode and position
type HyprlandMonitor struct {
	On                  bool
	Width, Height, X, Y int
	RefreshRate         float64
}

// HyprlandMonitors is each enabled display's state, by name. It asks Hyprland
// each time, as turning a display off sends no event.
func HyprlandMonitors(ctx context.Context) (map[string]HyprlandMonitor, error) {
	dir, err := hyprlandDir()
	if err != nil {
		return nil, err
	}
	replies, err := hyprlandBatch(ctx, dir, "monitors")
	if err != nil {
		return nil, err
	}
	var monitors []hyprlandMonitor
	if err := decodeReplies(replies, []any{&monitors}, 0); err != nil {
		return nil, err
	}
	states := make(map[string]HyprlandMonitor, len(monitors))
	for _, monitor := range monitors {
		if !monitor.Disabled {
			states[monitor.Name] = HyprlandMonitor{
				On:          monitor.DPMSStatus,
				Width:       monitor.Width,
				Height:      monitor.Height,
				X:           monitor.X,
				Y:           monitor.Y,
				RefreshRate: monitor.RefreshRate,
			}
		}
	}
	return states, nil
}

// HyprlandSetDPMS turns a display on or off
func HyprlandSetDPMS(ctx context.Context, display string, on bool) error {
	data, err := hyprlandCurrent(ctx)
	if err != nil {
		return err
	}
	if _, ok := data.Hyprland.Displays[display]; !ok {
		return fmt.Errorf("display %q: %w", display, ErrNotFound)
	}
	action := "off"
	if on {
		action = "on"
	}
	return hyprlandDispatch(ctx, data, hyprlandCommand{
		lua:     "hl.dsp.dpms({ action = " + luaString(action) + ", monitor = " + luaString(display) + " })",
		classic: "dpms " + action + " " + display,
	})
}

func omarchyCurrent(ctx context.Context) (*types.OmarchyData, error) {
	data, err := current(ctx)
	if err != nil {
		return nil, err
	}
	if data.Omarchy == nil {
		return nil, fmt.Errorf("%w: %w", errNoOmarchy, ErrUnsupported)
	}
	return data.Omarchy, nil
}

// omarchyRun opens, closes or toggles a shell plugin's panel
func omarchyRun(ctx context.Context, plugin string, action types.OmarchyAction, payload string) error {
	switch action {
	case types.OmarchyActionClose:
		_, err := omarchyCall(ctx, "shell", "hide", plugin)
		return err
	case types.OmarchyActionOpen:
		reply, err := omarchyCall(ctx, "shell", "summon", plugin, payload)
		if err != nil {
			return err
		}
		if reply != "ok" {
			return fmt.Errorf("the Omarchy shell couldn't open %s", plugin)
		}
		return nil
	case types.OmarchyActionToggle:
		_, err := omarchyCall(ctx, "shell", "toggle", plugin, payload)
		return err
	}
	return fmt.Errorf("action %q: %w", action, ErrNotFound)
}

// OmarchyMenu opens, closes or toggles the Omarchy menu at one of its
// routes. Closing needs no route.
func OmarchyMenu(ctx context.Context, id string, action types.OmarchyAction) error {
	data, err := omarchyCurrent(ctx)
	if err != nil {
		return err
	}
	if action != types.OmarchyActionClose || id != "" {
		// Like the menu, take an alias for its route, ignoring case and with
		// underscores for hyphens
		name := strings.ReplaceAll(strings.ToLower(id), "_", "-")
		index := slices.IndexFunc(data.Menus, func(menu types.OmarchyMenu) bool { return menu.ID == name })
		if index == -1 {
			index = slices.IndexFunc(data.Menus, func(menu types.OmarchyMenu) bool {
				return slices.ContainsFunc(menu.Aliases, func(alias string) bool {
					return strings.ReplaceAll(strings.ToLower(alias), "_", "-") == name
				})
			})
		}
		if index == -1 {
			return fmt.Errorf("menu %q: %w", id, ErrNotFound)
		}
		id = data.Menus[index].ID
	}
	payload, err := json.Marshal(map[string]string{"menu": id})
	if err != nil {
		return err
	}
	return omarchyRun(ctx, omarchyMenuPlugin, action, string(payload))
}

// OmarchyPanel opens, closes or toggles a shell plugin's panel or overlay
func OmarchyPanel(ctx context.Context, id string, action types.OmarchyAction) error {
	data, err := omarchyCurrent(ctx)
	if err != nil {
		return err
	}
	if !slices.ContainsFunc(data.Panels, func(panel types.OmarchyPanel) bool { return panel.ID == id }) {
		return fmt.Errorf("panel %q: %w", id, ErrNotFound)
	}
	return omarchyRun(ctx, id, action, "{}")
}

func hyprlandCurrent(ctx context.Context) (*types.DesktopData, error) {
	data, err := current(ctx)
	if err != nil {
		return nil, err
	}
	if data.Hyprland == nil {
		return nil, fmt.Errorf("no running Hyprland instance: %w", ErrUnsupported)
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
	lua := hyprlandUsesLua(data)
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
		return fmt.Errorf("hyprctl refused %q: %s", request, text)
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
