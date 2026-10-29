//go:build linux

package desktop

import (
	"cmp"
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

type hyprlandWorkspaceRef struct {
	ID      int    `json:"id"`
	Address string `json:"address"`
	Type    string `json:"type"`
	Name    string `json:"name"`
}

// key identifies the workspace, or is empty for none. From Hyprland 0.57
// it's the address, as only numbered workspaces still have an ID, and a
// numbered one's address is its ID. Before 0.57 it's the ID, which no
// workspace has as 0.
func (w hyprlandWorkspaceRef) key() string {
	if w.Address != "" {
		return w.Address
	}
	if w.ID == 0 {
		return ""
	}
	return strconv.Itoa(w.ID)
}

func (w hyprlandWorkspaceRef) special() bool {
	return w.Type == "special" || strings.HasPrefix(w.Name, "special:")
}

type hyprlandClient struct {
	Address        string               `json:"address"`
	Mapped         bool                 `json:"mapped"`
	Hidden         bool                 `json:"hidden"`
	At             [2]int               `json:"at"`
	Size           [2]int               `json:"size"`
	Workspace      hyprlandWorkspaceRef `json:"workspace"`
	Floating       bool                 `json:"floating"`
	Monitor        int                  `json:"monitor"`
	Class          string               `json:"class"`
	Title          string               `json:"title"`
	InitialClass   string               `json:"initialClass"`
	PID            int                  `json:"pid"`
	XWayland       bool                 `json:"xwayland"`
	Pinned         bool                 `json:"pinned"`
	Fullscreen     int                  `json:"fullscreen"`
	Grouped        []string             `json:"grouped"`
	Tags           []string             `json:"tags"`
	Swallowing     string               `json:"swallowing"`
	FocusHistoryID int                  `json:"focusHistoryID"`
	InhibitingIdle bool                 `json:"inhibitingIdle"`
	XDGTag         string               `json:"xdgTag"`
	ContentType    string               `json:"contentType"`
	TearingHint    bool                 `json:"tearingHint"`
	Visible        bool                 `json:"visible"`
	StableID       string               `json:"stableId"`
	InitialTitle   string               `json:"initialTitle"`
	XDGDescription string               `json:"xdgDescription"`
}

type hyprlandWorkspace struct {
	hyprlandWorkspaceRef
	Monitor       string `json:"monitor"`
	Windows       int    `json:"windows"`
	HasFullscreen bool   `json:"hasfullscreen"`
	IsPersistent  bool   `json:"ispersistent"`
	TiledLayout   string `json:"tiledLayout"`
	LastWindow    string `json:"lastwindow"`
}

type hyprlandMonitor struct {
	ID                    int                  `json:"id"`
	Name                  string               `json:"name"`
	Focused               bool                 `json:"focused"`
	ActiveWorkspace       hyprlandWorkspaceRef `json:"activeWorkspace"`
	SpecialWorkspace      hyprlandWorkspaceRef `json:"specialWorkspace"`
	Reserved              [4]int               `json:"reserved"` // left, top, right, bottom
	Scale                 float64              `json:"scale"`
	Transform             int                  `json:"transform"`
	DPMSStatus            bool                 `json:"dpmsStatus"`
	VRR                   bool                 `json:"vrr"`
	ActivelyTearing       bool                 `json:"activelyTearing"`
	DirectScanoutTo       string               `json:"directScanoutTo"`
	Disabled              bool                 `json:"disabled"`
	CurrentFormat         string               `json:"currentFormat"`
	MirrorOf              string               `json:"mirrorOf"`
	ColorManagementPreset string               `json:"colorManagementPreset"`
}

type hyprlandNamed struct {
	Name string `json:"name"`
}

type hyprlandDevices struct {
	Keyboards []struct {
		Name              string `json:"name"`
		Layout            string `json:"layout"`
		Variant           string `json:"variant"`
		Options           string `json:"options"`
		ActiveLayoutIndex int    `json:"active_layout_index"`
		ActiveKeymap      string `json:"active_keymap"`
		Main              bool   `json:"main"`
	} `json:"keyboards"`
	Mice []struct {
		Name         string  `json:"name"`
		DefaultSpeed float64 `json:"defaultSpeed"`
		ScrollFactor float64 `json:"scrollFactor"`
	} `json:"mice"`
	Tablets  []hyprlandNamed `json:"tablets"`
	Touch    []hyprlandNamed `json:"touch"`
	Switches []hyprlandNamed `json:"switches"`
}

// hyprlandLayers are each display's layer surfaces, by level from 0
// (background) to 3 (overlay)
type hyprlandLayers map[string]struct {
	Levels map[string][]struct {
		Namespace string `json:"namespace"`
	} `json:"levels"`
}

// hyprlandState is what one batch of requests reports
type hyprlandState struct {
	ActiveWindow struct {
		Address string `json:"address"`
	}
	ActiveWorkspace hyprlandWorkspace
	Clients         []hyprlandClient
	Devices         hyprlandDevices
	Layers          hyprlandLayers
	Monitors        []hyprlandMonitor
	Workspaces      []hyprlandWorkspace
}

// hyprlandStateRequests are the requests for hyprlandState
var hyprlandStateRequests = []string{"activewindow", "activeworkspace", "clients", "devices", "layers", "monitors", "workspaces"}

func (s *hyprlandState) targets() []any {
	return []any{&s.ActiveWindow, &s.ActiveWorkspace, &s.Clients, &s.Devices, &s.Layers, &s.Monitors, &s.Workspaces}
}

// hyprlandConfig is what only changes when the config reloads
type hyprlandConfig struct {
	Version struct {
		Version string `json:"version"`
		Tag     string `json:"tag"`
		Commit  string `json:"commit"`
		Branch  string `json:"branch"`
	}
	ConfigErrors    []string
	GlobalShortcuts []types.HyprlandGlobalShortcut
	Binds           []hyprlandBind
	Status          struct {
		ConfigProvider string `json:"configProvider"`
		Backend        string `json:"backend"`
	}
	Options []hyprlandOptionReply // In hyprlandOptions' order
}

type hyprlandBind struct {
	Locked       bool   `json:"locked"`
	Release      bool   `json:"release"`
	Repeat       bool   `json:"repeat"`
	LongPress    bool   `json:"longPress"`
	NonConsuming bool   `json:"non_consuming"`
	ModMask      int    `json:"modmask"`
	Submap       string `json:"submap"`
	Key          string `json:"key"`
	KeyCode      int    `json:"keycode"`
	CatchAll     bool   `json:"catch_all"`
	Description  string `json:"description"`
	Dispatcher   string `json:"dispatcher"`
	Arg          string `json:"arg"`
}

// hyprlandModifiers are Hyprland's modifier bits, in the order binds name them
var hyprlandModifiers = []struct {
	bit  int
	name string
}{
	{64, "SUPER"},
	{4, "CTRL"},
	{8, "ALT"},
	{1, "SHIFT"},
	{2, "CAPS"},
	{16, "MOD2"},
	{32, "MOD3"},
	{128, "MOD5"},
}

type hyprlandOption struct {
	name string // As Lua names it
	kind types.HyprlandOptionType
}

// hyprlandOptions are the config options System Bridge can read and set. Each
// is a toggle or a number, which suit a switch or slider in Home Assistant.
var hyprlandOptions = []hyprlandOption{
	{"animations.enabled", types.HyprlandOptionTypeBool},
	{"decoration.blur.enabled", types.HyprlandOptionTypeBool},
	{"decoration.dim_inactive", types.HyprlandOptionTypeBool},
	{"decoration.rounding", types.HyprlandOptionTypeInt},
	{"decoration.shadow.enabled", types.HyprlandOptionTypeBool},
	{"general.border_size", types.HyprlandOptionTypeInt},
	{"general.gaps_in", types.HyprlandOptionTypeInt},
	{"general.gaps_out", types.HyprlandOptionTypeInt},
	{"input.touchpad.natural_scroll", types.HyprlandOptionTypeBool},
	{"misc.vrr", types.HyprlandOptionTypeInt},
}

// hyprlandOptionReply is getoption's reply. Gaps come back as CSS, such as
// "5 5 5 5" for top, right, bottom and left.
type hyprlandOptionReply struct {
	Bool *bool   `json:"bool"`
	Int  *int    `json:"int"`
	CSS  *string `json:"css"`
}

// hyprlandConfigRequests are the requests for hyprlandConfig. status and the
// options are last as older versions may not know them.
var hyprlandConfigRequests = func() []string {
	requests := []string{"version", "configerrors", "globalshortcuts", "binds", "status"}
	for _, option := range hyprlandOptions {
		// The classic name, which getoption takes with either config
		requests = append(requests, "getoption "+strings.ReplaceAll(option.name, ".", ":"))
	}
	return requests
}()

// hyprlandConfigOptional is how many of the last config requests older
// versions may not know
var hyprlandConfigOptional = 1 + len(hyprlandOptions)

func (c *hyprlandConfig) targets() []any {
	targets := []any{&c.Version, &c.ConfigErrors, &c.GlobalShortcuts, &c.Binds, &c.Status}
	c.Options = make([]hyprlandOptionReply, len(hyprlandOptions))
	for i := range c.Options {
		targets = append(targets, &c.Options[i])
	}
	return targets
}

// hyprlandOptionValues turns getoption's replies into the options' values,
// leaving out any Hyprland didn't answer or that has no single value, such as
// gaps that differ by side
func hyprlandOptionValues(replies []hyprlandOptionReply) []types.HyprlandOption {
	options := []types.HyprlandOption{}
	for i, option := range hyprlandOptions {
		if i >= len(replies) {
			break
		}
		reply := replies[i]
		value := types.HyprlandOption{Name: option.name, Type: option.kind}
		switch {
		case option.kind == types.HyprlandOptionTypeBool && reply.Bool != nil:
			value.Bool = reply.Bool
		case option.kind == types.HyprlandOptionTypeInt && reply.Int != nil:
			value.Int = reply.Int
		case option.kind == types.HyprlandOptionTypeInt && reply.CSS != nil:
			sides := strings.Fields(*reply.CSS)
			if len(sides) == 0 || slices.ContainsFunc(sides, func(side string) bool { return side != sides[0] }) {
				continue
			}
			number, err := strconv.Atoi(sides[0])
			if err != nil {
				continue
			}
			value.Int = &number
		default:
			continue
		}
		options = append(options, value)
	}
	return options
}

// decodeReplies decodes each reply into its target. Only the last optional
// targets may be missing, for requests older versions don't know.
func decodeReplies(replies []json.RawMessage, targets []any, optional int) error {
	for i, target := range targets {
		required := i < len(targets)-optional
		if i >= len(replies) || replies[i] == nil {
			if required {
				return fmt.Errorf("no reply from Hyprland to request %d", i)
			}
			continue
		}
		if err := json.Unmarshal(replies[i], target); err != nil && required {
			return fmt.Errorf("error decoding Hyprland's reply: %w", err)
		}
	}
	return nil
}

type hyprlandScreencast struct {
	owner string
	name  string
}

// hyprlandEvents is what only Hyprland's events report
type hyprlandEvents struct {
	submap      string
	screencasts map[hyprlandScreencast]int // Active sessions sharing each target
	urgent      map[string]bool
	groupLock   bool
}

func newHyprlandEvents() hyprlandEvents {
	return hyprlandEvents{screencasts: map[hyprlandScreencast]int{}, urgent: map[string]bool{}}
}

// handle applies an event, reporting whether it changed what's reported
// without needing a new batch of requests
func (e *hyprlandEvents) handle(name string, data string) bool {
	switch name {
	case "submap":
		changed := e.submap != data
		e.submap = data
		return changed
	case "lockgroups":
		locked := data == "1"
		changed := e.groupLock != locked
		e.groupLock = locked
		return changed
	case "screencastv2":
		parts := strings.SplitN(data, ",", 3)
		if len(parts) != 3 {
			return false
		}
		key := hyprlandScreencast{owner: parts[1], name: parts[2]}
		if parts[0] == "1" {
			e.screencasts[key]++
		} else if e.screencasts[key] > 0 {
			e.screencasts[key]--
			if e.screencasts[key] == 0 {
				delete(e.screencasts, key)
			}
		}
		return true
	case "urgent":
		e.urgent[hyprlandAddress(data)] = true
	case "activewindowv2", "closewindow":
		delete(e.urgent, hyprlandAddress(data))
	}
	return false
}

// screencastType reads a share's owner, which Hyprland gives as a number
func screencastType(owner string) (types.HyprlandScreencastType, bool) {
	switch owner {
	case "0", string(types.HyprlandScreencastTypeMonitor):
		return types.HyprlandScreencastTypeMonitor, true
	case "1", string(types.HyprlandScreencastTypeWindow):
		return types.HyprlandScreencastTypeWindow, true
	case "2", string(types.HyprlandScreencastTypeRegion):
		return types.HyprlandScreencastTypeRegion, true
	}
	return "", false
}

func hyprlandFullscreenMode(mode int) types.HyprlandFullscreenMode {
	switch mode {
	case 0:
		return types.HyprlandFullscreenModeNone
	case 1:
		return types.HyprlandFullscreenModeMaximised
	default:
		return types.HyprlandFullscreenModeFullscreen
	}
}

// buildHyprland turns what Hyprland reports into the module's data, leaving
// out window titles unless titles is set
func buildHyprland(state hyprlandState, config hyprlandConfig, events hyprlandEvents, titles bool) types.DesktopData {
	monitorNames := make(map[int]string, len(state.Monitors))
	visibleWorkspaces := map[string]bool{}
	for _, monitor := range state.Monitors {
		monitorNames[monitor.ID] = monitor.Name
		if key := monitor.ActiveWorkspace.key(); key != "" {
			visibleWorkspaces[key] = true
		}
		if key := monitor.SpecialWorkspace.key(); key != "" {
			visibleWorkspaces[key] = true
		}
	}
	monitorName := func(id int) *string {
		if name, ok := monitorNames[id]; ok {
			return &name
		}
		return nil
	}

	data := types.DesktopData{
		Compositor: types.DesktopCompositorHyprland,
		Keyboard:   types.DesktopKeyboard{Layouts: []string{}},
		Windows:    make([]types.DesktopWindow, 0, len(state.Clients)),
		Workspaces: make([]types.DesktopWorkspace, 0, len(state.Workspaces)),
	}
	if state.ActiveWorkspace.Name != "" {
		data.FocusedWorkspace = nonEmpty(state.ActiveWorkspace.key())
	}

	hyprland := types.HyprlandData{
		Version: types.HyprlandVersion{
			Version:        config.Version.Version,
			Tag:            config.Version.Tag,
			Commit:         config.Version.Commit,
			Branch:         config.Version.Branch,
			ConfigProvider: nonEmpty(config.Status.ConfigProvider),
			Backend:        nonEmpty(config.Status.Backend),
		},
		Submap:          nonEmpty(events.submap),
		Screencasts:     []types.HyprlandScreencast{},
		ConfigErrors:    []string{},
		GroupLock:       events.groupLock,
		Displays:        make(map[string]types.HyprlandDisplay, len(state.Monitors)),
		Keyboards:       make([]types.HyprlandKeyboard, 0, len(state.Devices.Keyboards)),
		Mice:            make([]types.HyprlandMouse, 0, len(state.Devices.Mice)),
		Tablets:         deviceNames(state.Devices.Tablets),
		Touch:           deviceNames(state.Devices.Touch),
		Switches:        deviceNames(state.Devices.Switches),
		Binds:           hyprlandBinds(config.Binds, config.Status.ConfigProvider == "lua"),
		GlobalShortcuts: []types.HyprlandGlobalShortcut{},
		Windows:         make(map[string]types.HyprlandWindow, len(state.Clients)),
		Workspaces:      make(map[string]types.HyprlandWorkspace, len(state.Workspaces)),
		Options:         hyprlandOptionValues(config.Options),
	}
	for _, configError := range config.ConfigErrors {
		if configError != "" {
			hyprland.ConfigErrors = append(hyprland.ConfigErrors, configError)
		}
	}
	if config.GlobalShortcuts != nil {
		hyprland.GlobalShortcuts = config.GlobalShortcuts
	}

	for _, client := range state.Clients {
		if !client.Mapped || client.Address == "" {
			continue
		}
		focused := client.Address == state.ActiveWindow.Address
		if focused {
			data.FocusedWindow = pointer(client.Address)
		}
		window := types.DesktopWindow{
			ID:             client.Address,
			App:            nonEmpty(client.Class),
			Display:        monitorName(client.Monitor),
			X:              pointer(client.At[0]),
			Y:              pointer(client.At[1]),
			Width:          pointer(client.Size[0]),
			Height:         pointer(client.Size[1]),
			Focused:        focused,
			Fullscreen:     pointer(client.Fullscreen >= 2),
			Maximised:      pointer(client.Fullscreen == 1),
			Floating:       pointer(client.Floating),
			Urgent:         pointer(events.urgent[client.Address]),
			InhibitingIdle: pointer(client.InhibitingIdle),
		}
		if titles {
			window.Title = nonEmpty(client.Title)
		}
		if client.PID > 0 {
			window.PID = pointer(client.PID)
		}
		if client.Workspace.Name != "" {
			window.Workspace = nonEmpty(client.Workspace.key())
		}
		if client.ContentType != "none" {
			window.ContentType = nonEmpty(client.ContentType)
		}
		data.Windows = append(data.Windows, window)

		extra := types.HyprlandWindow{
			FullscreenMode: hyprlandFullscreenMode(client.Fullscreen),
			Pinned:         client.Pinned,
			XWayland:       client.XWayland,
			Hidden:         client.Hidden,
			Group:          orEmpty(client.Grouped),
			Tags:           orEmpty(client.Tags),
			FocusHistory:   client.FocusHistoryID,
			InitialApp:     nonEmpty(client.InitialClass),
			XDGTag:         nonEmpty(client.XDGTag),
			XDGDescription: nonEmpty(client.XDGDescription),
			TearingHint:    client.TearingHint,
			Visible:        client.Visible,
			StableID:       client.StableID,
		}
		if titles {
			extra.InitialTitle = nonEmpty(client.InitialTitle)
		}
		if client.Swallowing != "0x0" {
			extra.Swallowing = nonEmpty(client.Swallowing)
		}
		hyprland.Windows[client.Address] = extra
	}
	// Hyprland lists windows in an order that shifts as focus moves
	slices.SortFunc(data.Windows, func(a, b types.DesktopWindow) int { return cmp.Compare(a.ID, b.ID) })

	for _, workspace := range state.Workspaces {
		id := workspace.key()
		if id == "" {
			continue
		}
		data.Workspaces = append(data.Workspaces, types.DesktopWorkspace{
			ID:         id,
			Name:       nonEmpty(workspace.Name),
			Display:    nonEmpty(workspace.Monitor),
			Active:     visibleWorkspaces[id],
			Focused:    data.FocusedWorkspace != nil && *data.FocusedWorkspace == id,
			Special:    pointer(workspace.special()),
			Windows:    pointer(workspace.Windows),
			Fullscreen: pointer(workspace.HasFullscreen),
		})
		extra := types.HyprlandWorkspace{
			Layout:     nonEmpty(workspace.TiledLayout),
			Persistent: workspace.IsPersistent,
		}
		if workspace.LastWindow != "0x0" {
			extra.LastWindow = nonEmpty(workspace.LastWindow)
		}
		hyprland.Workspaces[id] = extra
	}
	// Numbered workspaces come first in order, then named and special ones
	slices.SortStableFunc(data.Workspaces, func(a, b types.DesktopWorkspace) int {
		left, leftErr := strconv.Atoi(a.ID)
		right, rightErr := strconv.Atoi(b.ID)
		switch {
		case leftErr == nil && rightErr == nil:
			return cmp.Compare(left, right)
		case leftErr == nil:
			return -1
		case rightErr == nil:
			return 1
		}
		return cmp.Compare(a.ID, b.ID)
	})

	for _, monitor := range state.Monitors {
		if monitor.Disabled {
			continue
		}
		if monitor.Focused {
			data.FocusedDisplay = pointer(monitor.Name)
		}
		display := types.HyprlandDisplay{
			Scale:         monitor.Scale,
			Transform:     monitor.Transform,
			VRR:           monitor.VRR,
			Tearing:       monitor.ActivelyTearing,
			DirectScanout: monitor.DirectScanoutTo != "" && monitor.DirectScanoutTo != "0",
			ColourPreset:  nonEmpty(monitor.ColorManagementPreset),
			Format:        nonEmpty(monitor.CurrentFormat),
			DPMS:          monitor.DPMSStatus,
			Reserved: types.HyprlandReserved{
				Left:   monitor.Reserved[0],
				Top:    monitor.Reserved[1],
				Right:  monitor.Reserved[2],
				Bottom: monitor.Reserved[3],
			},
			Layers: types.HyprlandLayers{
				Background: layerNamespaces(state.Layers, monitor.Name, "0"),
				Bottom:     layerNamespaces(state.Layers, monitor.Name, "1"),
				Top:        layerNamespaces(state.Layers, monitor.Name, "2"),
				Overlay:    layerNamespaces(state.Layers, monitor.Name, "3"),
			},
		}
		if mirrorID, err := strconv.Atoi(monitor.MirrorOf); err == nil {
			display.MirrorOf = monitorName(mirrorID)
		}
		display.SpecialWorkspace = nonEmpty(monitor.SpecialWorkspace.key())
		hyprland.Displays[monitor.Name] = display
	}

	for _, keyboard := range state.Devices.Keyboards {
		layouts := []string{}
		for layout := range strings.SplitSeq(keyboard.Layout, ",") {
			if layout = strings.TrimSpace(layout); layout != "" {
				layouts = append(layouts, layout)
			}
		}
		hyprland.Keyboards = append(hyprland.Keyboards, types.HyprlandKeyboard{
			Name:         keyboard.Name,
			Layouts:      layouts,
			Variant:      nonEmpty(keyboard.Variant),
			Options:      nonEmpty(keyboard.Options),
			ActiveLayout: keyboard.ActiveLayoutIndex,
			ActiveKeymap: nonEmpty(keyboard.ActiveKeymap),
			Main:         keyboard.Main,
		})
	}
	if main := mainKeyboard(hyprland.Keyboards); main != nil {
		data.Keyboard.Layouts = main.Layouts
		data.Keyboard.Name = main.ActiveKeymap
		if main.ActiveLayout >= 0 && main.ActiveLayout < len(main.Layouts) {
			data.Keyboard.Layout = pointer(main.Layouts[main.ActiveLayout])
		}
	}
	for _, mouse := range state.Devices.Mice {
		hyprland.Mice = append(hyprland.Mice, types.HyprlandMouse{
			Name:         mouse.Name,
			Speed:        mouse.DefaultSpeed,
			ScrollFactor: mouse.ScrollFactor,
		})
	}

	for share := range events.screencasts {
		shareType, ok := screencastType(share.owner)
		if !ok {
			continue
		}
		screencast := types.HyprlandScreencast{Type: shareType}
		if shareType == types.HyprlandScreencastTypeWindow {
			// Hyprland names a shared window by its title, which is only used to
			// find its ID
			screencast.Window = windowWithTitle(state.Clients, share.name)
		} else if _, ok := hyprland.Displays[share.name]; ok {
			screencast.Display = pointer(share.name)
		}
		hyprland.Screencasts = append(hyprland.Screencasts, screencast)
	}
	slices.SortFunc(hyprland.Screencasts, func(a, b types.HyprlandScreencast) int {
		return cmp.Or(
			cmp.Compare(a.Type, b.Type),
			cmp.Compare(valueOf(a.Display), valueOf(b.Display)),
			cmp.Compare(valueOf(a.Window), valueOf(b.Window)),
		)
	})

	data.Hyprland = &hyprland
	return data
}

// hyprlandBinds turns Hyprland's binds into the module's, naming their
// modifiers and keys
func hyprlandBinds(binds []hyprlandBind, lua bool) []types.HyprlandBind {
	out := make([]types.HyprlandBind, 0, len(binds))
	for _, bind := range binds {
		modifiers := []string{}
		for _, modifier := range hyprlandModifiers {
			if bind.ModMask&modifier.bit != 0 {
				modifiers = append(modifiers, modifier.name)
			}
		}
		key := bind.Key
		switch {
		case bind.CatchAll:
			key = "catchall"
		case key == "" && bind.KeyCode != 0:
			key = "code:" + strconv.Itoa(bind.KeyCode)
		}
		item := types.HyprlandBind{
			Modifiers:    modifiers,
			Key:          key,
			Submap:       nonEmpty(bind.Submap),
			Description:  nonEmpty(bind.Description),
			Locked:       bind.Locked,
			Release:      bind.Release,
			Repeat:       bind.Repeat,
			LongPress:    bind.LongPress,
			NonConsuming: bind.NonConsuming,
		}
		// A Lua bind's dispatcher only names its function, such as
		// HL.Dispatcher(window.close) from Hyprland 0.57 or __lua before, and
		// its argument is the function's number
		if !lua && bind.Dispatcher != "__lua" {
			item.Dispatcher = nonEmpty(bind.Dispatcher)
			item.Argument = nonEmpty(bind.Arg)
		}
		out = append(out, item)
	}
	return out
}

func deviceNames(devices []hyprlandNamed) []string {
	names := make([]string, 0, len(devices))
	for _, device := range devices {
		if device.Name != "" {
			names = append(names, device.Name)
		}
	}
	return names
}

func layerNamespaces(layers hyprlandLayers, monitor string, level string) []string {
	namespaces := []string{}
	for _, surface := range layers[monitor].Levels[level] {
		if surface.Namespace != "" {
			namespaces = append(namespaces, surface.Namespace)
		}
	}
	return namespaces
}

// mainKeyboard is the keyboard Hyprland marks as main, or the first one
func mainKeyboard(keyboards []types.HyprlandKeyboard) *types.HyprlandKeyboard {
	for i := range keyboards {
		if keyboards[i].Main {
			return &keyboards[i]
		}
	}
	if len(keyboards) > 0 {
		return &keyboards[0]
	}
	return nil
}

// windowWithTitle is the ID of the only window with title, or nil when there
// isn't exactly one
func windowWithTitle(clients []hyprlandClient, title string) *string {
	var match *string
	for _, client := range clients {
		if client.Title != title || !client.Mapped {
			continue
		}
		if match != nil {
			return nil
		}
		match = pointer(client.Address)
	}
	return match
}

func orEmpty(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}

func valueOf(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
