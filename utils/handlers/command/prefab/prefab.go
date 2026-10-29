// Package prefab holds ready-made commands for common system tasks. Each one
// picks the program to run for the platform and desktop when it runs, so an
// allowlist entry naming a prefab works without a full path of its own.
package prefab

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"slices"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// candidate is a program a prefab can run, with its arguments
type candidate struct {
	program   string
	arguments []string
	// env is extra KEY=VALUE variables for the program, which can use the
	// output placeholders
	env []string
	// detach starts the program without waiting for it, for apps that keep
	// running, such as a terminal
	detach bool
	// when reports whether the candidate applies to this session, such as its
	// desktop. Nil means it always does.
	when func() bool
}

// Builtin runs a prefab inside System Bridge, for platforms with no program
// to run. It gets the prefab's arguments with their placeholders filled in,
// and returns what it has to report as the command's output.
type Builtin func(ctx context.Context, arguments []string) (string, error)

// saves is a built-in whose only result is the file it saves, which the
// command reports itself
func saves(run func(ctx context.Context, arguments []string) error) Builtin {
	return func(ctx context.Context, arguments []string) (string, error) {
		return "", run(ctx, arguments)
	}
}

// Prefab is a ready-made command
type Prefab struct {
	ID          string
	Name        string
	Description string
	// candidates are tried in order, keyed by runtime.GOOS
	candidates map[string][]candidate
	// builtin runs when no candidate applies. It is only set on the platforms
	// it's built for, and builtinWhen, when set, says whether it can run here.
	builtin          Builtin
	builtinWhen      func() bool
	builtinArguments []string
	// check, when set, says why the prefab can't run here before any program
	// is looked for, such as a monitor that isn't connected
	check func() error
	// validateArguments, when set, means the command's own arguments are what
	// the prefab runs with, such as an Omarchy IPC call, and checks them
	validateArguments func(arguments []string) error
}

// TakesArguments reports whether the prefab runs with the command's own
// arguments rather than its built-in ones
func (p Prefab) TakesArguments() bool { return p.validateArguments != nil }

// ValidateArguments checks the arguments a command passes to the prefab
func (p Prefab) ValidateArguments(arguments []string) error {
	if p.validateArguments == nil {
		return nil
	}
	return p.validateArguments(arguments)
}

// Resolved is what a prefab runs here: a program, or its built-in when Run is
// set
type Resolved struct {
	Command   string
	Arguments []string
	// Env is the program's extra variables, before their placeholders are
	// filled in
	Env []string
	// Detach starts the program without waiting for it
	Detach bool
	Run    Builtin
}

// Each desktop's own tools come first, with Omarchy's ahead on Hyprland as
// Omarchy is the desktop System Bridge supports most closely, then popular
// tools that work on more than one. omasnap saves to OMASNAP_SCREENSHOT_DIR
// under a name of its own.
var omasnapEnv = []string{"OMASNAP_SCREENSHOT_DIR=" + outputDirPlaceholder}

var catalogue = []Prefab{
	{
		ID:          "lock",
		Name:        "Lock screen",
		Description: "Lock the screen",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omarchy-system-lock", when: onHyprland},
				{program: "loginctl", arguments: []string{"lock-session"}},
			},
			"windows": {{program: "rundll32.exe", arguments: []string{"user32.dll,LockWorkStation"}}},
			"darwin":  {{program: "pmset", arguments: []string{"displaysleepnow"}}},
		},
	},
	{
		ID:          "sleep",
		Name:        "Sleep",
		Description: "Put the computer to sleep",
		candidates: map[string][]candidate{
			"linux":   {{program: "systemctl", arguments: []string{"suspend"}}},
			"windows": {{program: "rundll32.exe", arguments: []string{"powrprof.dll,SetSuspendState", "0,1,0"}}},
			"darwin":  {{program: "pmset", arguments: []string{"sleepnow"}}},
		},
	},
	{
		ID:          "logout",
		Name:        "Log out",
		Description: "Log out of the desktop, closing apps",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omarchy-system", arguments: []string{"logout"}, when: onHyprland},
				{program: "hyprctl", arguments: []string{"dispatch", "hl.dsp.exit()"}, when: onHyprlandLua},
				{program: "hyprctl", arguments: []string{"dispatch", "exit"}, when: onHyprland},
				{program: "qdbus6", arguments: []string{"org.kde.Shutdown", "/Shutdown", "logout"}, when: onKDE},
				{program: "qdbus", arguments: []string{"org.kde.Shutdown", "/Shutdown", "logout"}, when: onKDE},
				{program: "gnome-session-quit", arguments: []string{"--logout", "--no-prompt"}, when: onGNOME},
				{program: "loginctl", arguments: []string{"terminate-session", "auto"}},
			},
			"windows": {{program: "shutdown.exe", arguments: []string{"/l"}}},
			"darwin":  {{program: "osascript", arguments: []string{"-e", `tell application "System Events" to log out`}}},
		},
	},
	{
		ID:          "file-manager",
		Name:        "Open the file manager",
		Description: "Open the file manager at the home folder",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omarchy-launch-nautilus", when: onHyprland, detach: true},
				{program: "xdg-open", arguments: []string{homePlaceholder}, detach: true},
			},
			"windows": {{program: "explorer.exe", arguments: []string{homePlaceholder}, detach: true}},
			"darwin":  {{program: "open", arguments: []string{homePlaceholder}}},
		},
	},
	{
		ID:          "terminal",
		Name:        "Open a terminal",
		Description: "Open a terminal window",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omarchy-launch-terminal", when: onHyprland, detach: true},
				{program: "konsole", when: onKDE, detach: true},
				{program: "kgx", when: onGNOME, detach: true},
				{program: "gnome-terminal", when: onGNOME, detach: true},
				{program: "xdg-terminal-exec", detach: true},
				{program: "x-terminal-emulator", when: onX11, detach: true},
			},
			"windows": {{program: "wt.exe", detach: true}},
			"darwin":  {{program: "open", arguments: []string{"-a", "Terminal"}}},
		},
	},
	{
		ID:          "clipboard",
		Name:        "Get the clipboard",
		Description: "Return the text on the clipboard",
		candidates: map[string][]candidate{
			"linux": {
				{program: "wl-paste", arguments: []string{"--no-newline"}, when: onWayland},
				{program: "xclip", arguments: []string{"-selection", "clipboard", "-o"}, when: onX11},
				{program: "xsel", arguments: []string{"--clipboard", "--output"}, when: onX11},
			},
			"windows": {{program: "powershell.exe", arguments: []string{"-NoProfile", "-NonInteractive", "-Command", "Get-Clipboard -Raw"}}},
			"darwin":  {{program: "pbpaste"}},
		},
	},
	{
		ID:          "screenshot",
		Name:        "Screenshot",
		Description: "Capture the screen to a file and return its path",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omasnap", arguments: []string{"--save", "fullscreen"}, env: omasnapEnv, when: onHyprland},
				{program: "grimblast", arguments: []string{"save", "screen", outputPlaceholder}, when: onHyprland},
				{program: "grim", arguments: []string{outputPlaceholder}, when: onWlroots},
				{program: "spectacle", arguments: []string{"-b", "-n", "-f", "-o", outputPlaceholder}, when: onKDE},
				{program: "gnome-screenshot", arguments: []string{"-f", outputPlaceholder}, when: onGNOME},
				{program: "flameshot", arguments: []string{"full", "-p", outputPlaceholder}},
				{program: "scrot", arguments: []string{outputPlaceholder}, when: onX11},
				{program: "maim", arguments: []string{outputPlaceholder}, when: onX11},
			},
			"darwin": {{program: "screencapture", arguments: []string{"-x", outputPlaceholder}}},
		},
		builtin:          screenshotBuiltin,
		builtinWhen:      screenshotBuiltinWhen,
		builtinArguments: []string{outputPlaceholder},
	},
	{
		ID:          "screenshot-window",
		Name:        "Screenshot of a window",
		Description: "Capture a window to a file and return its path",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omasnap", arguments: []string{"--save", "windows"}, env: omasnapEnv, when: onHyprland},
				{program: "grimblast", arguments: []string{"save", "active", outputPlaceholder}, when: onHyprland},
				{program: "hyprshot", arguments: []string{"-m", "window", "-m", "active", "-s", "-o", outputDirPlaceholder, "-f", outputNamePlaceholder}, when: onHyprland},
				{program: "spectacle", arguments: []string{"-a", "-b", "-n", "-o", outputPlaceholder}, when: onKDE},
				{program: "gnome-screenshot", arguments: []string{"-w", "-f", outputPlaceholder}, when: onGNOME},
				{program: "scrot", arguments: []string{"-u", outputPlaceholder}, when: onX11},
			},
			"darwin": {{program: "screencapture", arguments: []string{"-x", "-o", "-w", outputPlaceholder}}},
		},
		builtin:          screenshotWindowBuiltin,
		builtinArguments: []string{outputPlaceholder},
	},
	{
		ID:          "screenshot-region",
		Name:        "Screenshot of a region",
		Description: "Pick an area of the screen to capture to a file, and return its path",
		candidates: map[string][]candidate{
			"linux": {
				{program: "omasnap", arguments: []string{"--save", "region"}, env: omasnapEnv, when: onHyprland},
				{program: "grimblast", arguments: []string{"save", "area", outputPlaceholder}, when: onHyprland},
				{program: "hyprshot", arguments: []string{"-m", "region", "-s", "-o", outputDirPlaceholder, "-f", outputNamePlaceholder}, when: onHyprland},
				{program: "spectacle", arguments: []string{"-r", "-b", "-n", "-o", outputPlaceholder}, when: onKDE},
				{program: "gnome-screenshot", arguments: []string{"-a", "-f", outputPlaceholder}, when: onGNOME},
				{program: "flameshot", arguments: []string{"gui", "-p", outputPlaceholder}},
				{program: "scrot", arguments: []string{"-s", outputPlaceholder}, when: onX11},
				{program: "maim", arguments: []string{"-s", outputPlaceholder}, when: onX11},
			},
			"darwin": {{program: "screencapture", arguments: []string{"-x", "-i", outputPlaceholder}}},
		},
	},
	omarchyIPCPrefab,
}

var (
	lookPath = exec.LookPath
	goos     = runtime.GOOS
)

// Get returns the prefab with the given ID, including a screenshot of any one
// monitor
func Get(id string) (Prefab, bool) {
	for _, p := range catalogue {
		if p.ID == id {
			return p, true
		}
	}
	if monitor, ok := monitorID(id); ok {
		return monitorPrefab(monitor), true
	}
	return Prefab{}, false
}

// Resolve picks the first candidate that applies here and is installed, or
// the prefab's built-in when it has one
func (p Prefab) Resolve() (Resolved, error) {
	if p.check != nil {
		if err := p.check(); err != nil {
			return Resolved{}, err
		}
	}
	tried := []string{}
	for _, c := range p.candidates[goos] {
		if c.when != nil && !c.when() {
			continue
		}
		tried = append(tried, c.program)
		if path, err := lookPath(c.program); err == nil {
			return Resolved{Command: path, Arguments: slices.Clone(c.arguments), Env: slices.Clone(c.env), Detach: c.detach}, nil
		}
	}
	if p.builtin != nil && (p.builtinWhen == nil || p.builtinWhen()) {
		return Resolved{Arguments: slices.Clone(p.builtinArguments), Run: p.builtin}, nil
	}
	if len(tried) == 0 {
		return Resolved{}, fmt.Errorf("%s isn't available on this desktop", p.Name)
	}
	return Resolved{}, fmt.Errorf("install %s to use %s", strings.Join(tried, " or "), p.Name)
}

// Env is the environment for a program a prefab runs: the desktop session's,
// with the candidate's own variables, whose placeholders must already be
// filled in
func Env(extra []string) []string {
	return append(sessionEnv(), extra...)
}

// List returns every prefab and how it would run here, with a screenshot of
// each monitor when there's more than one. A built-in has no command.
func List() []types.CommandPrefab {
	all := append(slices.Clone(catalogue), monitorPrefabs()...)
	prefabs := make([]types.CommandPrefab, 0, len(all))
	for _, p := range all {
		info := types.CommandPrefab{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Arguments:   []string{},
		}
		resolved, err := p.Resolve()
		if err != nil {
			info.Reason = err.Error()
		} else {
			info.Available = true
			info.Command = resolved.Command
			info.Arguments = append(info.Arguments, resolved.Arguments...)
		}
		prefabs = append(prefabs, info)
	}
	return prefabs
}
