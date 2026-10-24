package types

// DesktopCompositor is what reports the desktop
type DesktopCompositor string

const (
	DesktopCompositorHyprland DesktopCompositor = "hyprland"
	DesktopCompositorWayland  DesktopCompositor = "wayland"
	DesktopCompositorWindows  DesktopCompositor = "windows"
)

// DesktopData is the desktop's windows, workspaces and keyboard layout. The
// whole module is null where no supported compositor is running. Fields a
// platform can't provide are null.
type DesktopData struct {
	Compositor       DesktopCompositor  `json:"compositor" mapstructure:"compositor"`
	FocusedWindow    *string            `json:"focused_window" mapstructure:"focused_window"`
	FocusedWorkspace *string            `json:"focused_workspace" mapstructure:"focused_workspace"`
	Keyboard         DesktopKeyboard    `json:"keyboard" mapstructure:"keyboard"`
	Windows          []DesktopWindow    `json:"windows" mapstructure:"windows"`
	Workspaces       []DesktopWorkspace `json:"workspaces" mapstructure:"workspaces"`
	Hyprland         *HyprlandData      `json:"hyprland" mapstructure:"hyprland"` // Only on Hyprland
}

// DesktopKeyboard is the active keyboard layout
type DesktopKeyboard struct {
	Layout  *string  `json:"layout" mapstructure:"layout"` // The xkb layout code, or the layout ID on Windows
	Name    *string  `json:"name" mapstructure:"name"`
	Layouts []string `json:"layouts" mapstructure:"layouts"`
}

// DesktopWindow is a top-level window
type DesktopWindow struct {
	ID             string  `json:"id" mapstructure:"id"`
	App            *string `json:"app" mapstructure:"app"`
	Title          *string `json:"title" mapstructure:"title"` // Only reported when the desktop.windowTitles setting is on
	PID            *int    `json:"pid" mapstructure:"pid"`
	Workspace      *string `json:"workspace" mapstructure:"workspace"`
	Display        *string `json:"display" mapstructure:"display"` // The displays module's id
	X              *int    `json:"x" mapstructure:"x"`
	Y              *int    `json:"y" mapstructure:"y"`
	Width          *int    `json:"width" mapstructure:"width"`
	Height         *int    `json:"height" mapstructure:"height"`
	Focused        bool    `json:"focused" mapstructure:"focused"`
	Fullscreen     *bool   `json:"fullscreen" mapstructure:"fullscreen"`
	Maximised      *bool   `json:"maximised" mapstructure:"maximised"`
	Minimised      *bool   `json:"minimised" mapstructure:"minimised"`
	Floating       *bool   `json:"floating" mapstructure:"floating"`
	Urgent         *bool   `json:"urgent" mapstructure:"urgent"`
	InhibitingIdle *bool   `json:"inhibiting_idle" mapstructure:"inhibiting_idle"`
	ContentType    *string `json:"content_type" mapstructure:"content_type"` // video, game or photo
}

// DesktopWorkspace is a workspace, or virtual desktop
type DesktopWorkspace struct {
	ID         string  `json:"id" mapstructure:"id"`
	Name       *string `json:"name" mapstructure:"name"`
	Display    *string `json:"display" mapstructure:"display"` // The displays module's id
	Active     bool    `json:"active" mapstructure:"active"`   // Shown on its display
	Focused    bool    `json:"focused" mapstructure:"focused"`
	Special    *bool   `json:"special" mapstructure:"special"` // A Hyprland special workspace, the scratchpad
	Windows    *int    `json:"windows" mapstructure:"windows"`
	Fullscreen *bool   `json:"fullscreen" mapstructure:"fullscreen"`
}

// HyprlandData is what only Hyprland reports. Its maps are keyed by the shared
// display, window and workspace IDs.
type HyprlandData struct {
	Version         HyprlandVersion              `json:"version" mapstructure:"version"`
	Submap          *string                      `json:"submap" mapstructure:"submap"` // null for the default
	Screencasts     []HyprlandScreencast         `json:"screencasts" mapstructure:"screencasts"`
	ConfigErrors    []string                     `json:"config_errors" mapstructure:"config_errors"`
	GroupLock       bool                         `json:"group_lock" mapstructure:"group_lock"`
	Displays        map[string]HyprlandDisplay   `json:"displays" mapstructure:"displays"`
	Keyboards       []HyprlandKeyboard           `json:"keyboards" mapstructure:"keyboards"`
	Mice            []HyprlandMouse              `json:"mice" mapstructure:"mice"`
	Tablets         []string                     `json:"tablets" mapstructure:"tablets"`
	Touch           []string                     `json:"touch" mapstructure:"touch"`
	Switches        []string                     `json:"switches" mapstructure:"switches"`
	Binds           []HyprlandBind               `json:"binds" mapstructure:"binds"`
	GlobalShortcuts []HyprlandGlobalShortcut     `json:"global_shortcuts" mapstructure:"global_shortcuts"`
	Windows         map[string]HyprlandWindow    `json:"windows" mapstructure:"windows"`
	Workspaces      map[string]HyprlandWorkspace `json:"workspaces" mapstructure:"workspaces"`
}

// HyprlandVersion is the running Hyprland's build and setup
type HyprlandVersion struct {
	Version        string  `json:"version" mapstructure:"version"`
	Tag            string  `json:"tag" mapstructure:"tag"`
	Commit         string  `json:"commit" mapstructure:"commit"`
	Branch         string  `json:"branch" mapstructure:"branch"`
	ConfigProvider *string `json:"config_provider" mapstructure:"config_provider"` // lua or hyprlang
	Backend        *string `json:"backend" mapstructure:"backend"`                 // drm, wayland or headless
}

// HyprlandScreencastType is what's being shared
type HyprlandScreencastType string

const (
	HyprlandScreencastTypeMonitor HyprlandScreencastType = "monitor"
	HyprlandScreencastTypeRegion  HyprlandScreencastType = "region"
	HyprlandScreencastTypeWindow  HyprlandScreencastType = "window"
)

// HyprlandScreencast is an active screen share
type HyprlandScreencast struct {
	Type    HyprlandScreencastType `json:"type" mapstructure:"type"`
	Display *string                `json:"display" mapstructure:"display"`
	Window  *string                `json:"window" mapstructure:"window"` // The shared window's ID, when only one window matches
}

// HyprlandDisplay is what Hyprland reports about a display that the displays
// module doesn't
type HyprlandDisplay struct {
	Scale            float64          `json:"scale" mapstructure:"scale"`
	Transform        int              `json:"transform" mapstructure:"transform"`
	VRR              bool             `json:"vrr" mapstructure:"vrr"`
	Tearing          bool             `json:"tearing" mapstructure:"tearing"`
	DirectScanout    bool             `json:"direct_scanout" mapstructure:"direct_scanout"`
	ColourPreset     *string          `json:"colour_preset" mapstructure:"colour_preset"`
	Format           *string          `json:"format" mapstructure:"format"`
	DPMS             bool             `json:"dpms" mapstructure:"dpms"`
	MirrorOf         *string          `json:"mirror_of" mapstructure:"mirror_of"`
	Reserved         HyprlandReserved `json:"reserved" mapstructure:"reserved"`
	SpecialWorkspace *string          `json:"special_workspace" mapstructure:"special_workspace"`
	Layers           HyprlandLayers   `json:"layers" mapstructure:"layers"`
}

// HyprlandReserved is the space bars and other layer surfaces keep free at
// each edge of a display
type HyprlandReserved struct {
	Top    int `json:"top" mapstructure:"top"`
	Right  int `json:"right" mapstructure:"right"`
	Bottom int `json:"bottom" mapstructure:"bottom"`
	Left   int `json:"left" mapstructure:"left"`
}

// HyprlandLayers are the namespaces of a display's layer surfaces, by level
type HyprlandLayers struct {
	Background []string `json:"background" mapstructure:"background"`
	Bottom     []string `json:"bottom" mapstructure:"bottom"`
	Top        []string `json:"top" mapstructure:"top"`
	Overlay    []string `json:"overlay" mapstructure:"overlay"`
}

// HyprlandKeyboard is a keyboard and its layouts
type HyprlandKeyboard struct {
	Name         string   `json:"name" mapstructure:"name"`
	Layouts      []string `json:"layouts" mapstructure:"layouts"`
	Variant      *string  `json:"variant" mapstructure:"variant"`
	Options      *string  `json:"options" mapstructure:"options"`
	ActiveLayout int      `json:"active_layout" mapstructure:"active_layout"`
	ActiveKeymap *string  `json:"active_keymap" mapstructure:"active_keymap"`
	Main         bool     `json:"main" mapstructure:"main"` // The keyboard that last sent a key, which can be an input method's virtual keyboard
}

// HyprlandMouse is a pointer device
type HyprlandMouse struct {
	Name         string  `json:"name" mapstructure:"name"`
	Speed        float64 `json:"speed" mapstructure:"speed"`
	ScrollFactor float64 `json:"scroll_factor" mapstructure:"scroll_factor"` // -1 when not set
}

// HyprlandBind is a key or mouse binding, in the config's order
type HyprlandBind struct {
	Modifiers    []string `json:"modifiers" mapstructure:"modifiers"` // SUPER, SHIFT, CTRL, ALT, CAPS, MOD2, MOD3 or MOD5
	Key          string   `json:"key" mapstructure:"key"`             // A key name, code:N for a keycode, or mouse:N for a mouse button
	Submap       *string  `json:"submap" mapstructure:"submap"`       // null for the default
	Description  *string  `json:"description" mapstructure:"description"`
	Dispatcher   *string  `json:"dispatcher" mapstructure:"dispatcher"` // null when the bind runs Lua, which Hyprland doesn't describe
	Argument     *string  `json:"argument" mapstructure:"argument"`     // The global shortcut's name for the global dispatcher
	Locked       bool     `json:"locked" mapstructure:"locked"`         // Works on the lock screen
	Release      bool     `json:"release" mapstructure:"release"`
	Repeat       bool     `json:"repeat" mapstructure:"repeat"`
	LongPress    bool     `json:"long_press" mapstructure:"long_press"`
	NonConsuming bool     `json:"non_consuming" mapstructure:"non_consuming"` // The app gets the key too
}

// HyprlandGlobalShortcut is a shortcut an app has registered
type HyprlandGlobalShortcut struct {
	Name        string `json:"name" mapstructure:"name"`
	Description string `json:"description" mapstructure:"description"`
}

// HyprlandFullscreenMode is how a window fills its display
type HyprlandFullscreenMode string

const (
	HyprlandFullscreenModeFullscreen HyprlandFullscreenMode = "fullscreen"
	HyprlandFullscreenModeMaximised  HyprlandFullscreenMode = "maximised"
	HyprlandFullscreenModeNone       HyprlandFullscreenMode = "none"
)

// HyprlandWindow is what Hyprland reports about a window beyond the shared
// fields
type HyprlandWindow struct {
	FullscreenMode HyprlandFullscreenMode `json:"fullscreen_mode" mapstructure:"fullscreen_mode"`
	Pinned         bool                   `json:"pinned" mapstructure:"pinned"`
	XWayland       bool                   `json:"xwayland" mapstructure:"xwayland"`
	Hidden         bool                   `json:"hidden" mapstructure:"hidden"`
	Group          []string               `json:"group" mapstructure:"group"`
	Swallowing     *string                `json:"swallowing" mapstructure:"swallowing"`
	Tags           []string               `json:"tags" mapstructure:"tags"`
	FocusHistory   int                    `json:"focus_history" mapstructure:"focus_history"` // 0 is the most recent
	InitialApp     *string                `json:"initial_app" mapstructure:"initial_app"`
	XDGTag         *string                `json:"xdg_tag" mapstructure:"xdg_tag"`
	TearingHint    bool                   `json:"tearing_hint" mapstructure:"tearing_hint"`
}

// HyprlandWorkspace is what Hyprland reports about a workspace beyond the
// shared fields
type HyprlandWorkspace struct {
	Layout     *string `json:"layout" mapstructure:"layout"` // dwindle, master, scrolling or monocle
	Persistent bool    `json:"persistent" mapstructure:"persistent"`
}
