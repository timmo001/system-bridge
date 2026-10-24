//go:build linux

package desktop

import (
	"bufio"
	"bytes"
	"cmp"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// omarchyTimeout limits each call to the Omarchy shell
const omarchyTimeout = 2 * time.Second

// omarchyMenuPlugin is the plugin behind the Omarchy menu
const omarchyMenuPlugin = "omarchy.menu"

var errNoOmarchy = errors.New("the Omarchy shell isn't running")

// omarchy keeps what the Omarchy shell last reported, asking it again only
// once the shell restarts or its plugins or menus change
type omarchy struct {
	mu   sync.Mutex
	key  []time.Time
	data *types.OmarchyData
}

var omarchySource = &omarchy{}

func omarchyPath() string {
	if path := os.Getenv("OMARCHY_PATH"); path != "" {
		return path
	}
	return "/usr/share/omarchy"
}

func runtimeDir() string {
	if dir := os.Getenv("XDG_RUNTIME_DIR"); dir != "" {
		return dir
	}
	return fmt.Sprintf("/run/user/%d", os.Getuid())
}

// newest is the most recently changed of the files matching pattern
func newest(pattern string) string {
	matches, _ := filepath.Glob(pattern)
	found := ""
	var foundTime time.Time
	for _, match := range matches {
		info, err := os.Stat(match)
		if err != nil {
			continue
		}
		if found == "" || info.ModTime().After(foundTime) {
			found, foundTime = match, info.ModTime()
		}
	}
	return found
}

// waylandDisplay is the session's display. The backend can start outside the
// session's environment, such as from systemd, so without WAYLAND_DISPLAY it
// uses the newest display.
func waylandDisplay() string {
	if display := os.Getenv("WAYLAND_DISPLAY"); display != "" {
		return display
	}
	if socket := newest(filepath.Join(runtimeDir(), "wayland-[0-9]")); socket != "" {
		return filepath.Base(socket)
	}
	return ""
}

// omarchySocket is the shell's own IPC socket. Its name comes from the shell's
// config and display, so without a match it uses the newest shell's.
func omarchySocket() (string, error) {
	sum := md5.Sum([]byte(omarchyPath() + "/shell\n" + waylandDisplay()))
	socket := filepath.Join(runtimeDir(), "omarchy-shell-"+hex.EncodeToString(sum[:])[:16]+".sock")
	if _, err := os.Stat(socket); err == nil {
		return socket, nil
	}
	if socket := newest(filepath.Join(runtimeDir(), "omarchy-shell-*.sock")); socket != "" {
		return socket, nil
	}
	return "", errNoOmarchy
}

// omarchyCall runs an IPC call through the shell's socket and returns its
// output. Fields are split by unit separators and the request ends with a
// record separator. The shell replies OK with the output once the call has
// run, or SKIP when it ran nothing.
func omarchyCall(ctx context.Context, target string, function string, arguments ...string) (string, error) {
	fields := append([]string{target, function}, arguments...)
	for _, field := range fields {
		if strings.ContainsAny(field, "\x1e\x1f") {
			return "", fmt.Errorf("argument %q holds a separator", field)
		}
	}
	socket, err := omarchySocket()
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(ctx, omarchyTimeout)
	defer cancel()
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", socket)
	if err != nil {
		return "", errNoOmarchy
	}
	defer func() { _ = conn.Close() }()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}

	if _, err := conn.Write([]byte(strings.Join(fields, "\x1f") + "\x1e")); err != nil {
		return "", err
	}
	reply, err := bufio.NewReader(conn).ReadString('\x1e')
	if err != nil {
		return "", fmt.Errorf("the Omarchy shell didn't answer %s %s: %w", target, function, err)
	}
	reply = strings.TrimSuffix(reply, "\x1e")
	if output, ok := strings.CutPrefix(reply, "OK\x1f"); ok {
		return strings.TrimRight(output, "\n"), nil
	}
	return "", fmt.Errorf("the Omarchy shell has no %s %s taking %d arguments", target, function, len(arguments))
}

// get reports the shell, or nil when it isn't running
func (o *omarchy) get(ctx context.Context) *types.OmarchyData {
	socket, err := omarchySocket()
	if err != nil {
		o.mu.Lock()
		o.key, o.data = nil, nil
		o.mu.Unlock()
		return nil
	}

	// The socket is made again when the shell restarts, and the shell's
	// config changes when a plugin is added, removed, enabled or disabled
	config := filepath.Join(os.Getenv("HOME"), ".config", "omarchy")
	var key []time.Time
	for _, path := range []string{
		socket,
		filepath.Join(config, "shell.json"),
		filepath.Join(config, "plugins"),
		omarchyDefaultMenu(),
		omarchyUserMenu(),
	} {
		var modified time.Time
		if info, err := os.Stat(path); err == nil {
			modified = info.ModTime()
		}
		key = append(key, modified)
	}

	o.mu.Lock()
	defer o.mu.Unlock()
	if o.data != nil && slices.Equal(o.key, key) {
		return o.data
	}

	data, err := readOmarchy(ctx)
	if err != nil {
		slog.Debug("Failed to read the Omarchy shell", "error", err)
		o.key, o.data = nil, nil
		return nil
	}
	o.key, o.data = key, data
	return o.data
}

func readOmarchy(ctx context.Context) (*types.OmarchyData, error) {
	output, err := omarchyCall(ctx, "shell", "listPlugins")
	if err != nil {
		return nil, err
	}
	var plugins []struct {
		ID      string   `json:"id"`
		Name    string   `json:"name"`
		Kinds   []string `json:"kinds"`
		Enabled bool     `json:"enabled"`
	}
	if err := json.Unmarshal([]byte(output), &plugins); err != nil {
		return nil, fmt.Errorf("reading the shell's plugins: %w", err)
	}

	targets, err := omarchyTargets(ctx)
	if err != nil {
		return nil, err
	}
	toggles := map[string]bool{}
	for _, target := range targets {
		toggles[target.Name] = slices.ContainsFunc(target.Functions, func(function types.OmarchyFunction) bool {
			return function.Name == "toggle"
		})
	}

	data := types.OmarchyData{
		Menus:   omarchyMenus(),
		Panels:  []types.OmarchyPanel{},
		Targets: targets,
	}
	for _, plugin := range plugins {
		if !plugin.Enabled || slices.Contains(plugin.Kinds, "menu") {
			continue
		}
		// A bar widget only has a panel when it answers to toggle
		if slices.Contains(plugin.Kinds, "panel") || slices.Contains(plugin.Kinds, "overlay") ||
			(slices.Contains(plugin.Kinds, "bar-widget") && toggles[plugin.ID]) {
			data.Panels = append(data.Panels, types.OmarchyPanel{ID: plugin.ID, Name: plugin.Name})
		}
	}
	slices.SortFunc(data.Panels, func(a, b types.OmarchyPanel) int {
		return cmp.Or(strings.Compare(strings.ToLower(a.Name), strings.ToLower(b.Name)), strings.Compare(a.ID, b.ID))
	})
	return &data, nil
}

var (
	ipcTarget   = regexp.MustCompile(`^target (\S+)$`)
	ipcFunction = regexp.MustCompile(`^\s+function (\w+)\((.*)\): (\w+)$`)
)

// omarchyTargets lists the shell's IPC targets, which only qs ipc can show
func omarchyTargets(ctx context.Context) ([]types.OmarchyTarget, error) {
	ctx, cancel := context.WithTimeout(ctx, omarchyTimeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, "qs", "ipc", "-n", "-p", omarchyPath()+"/shell", "show")
	cmd.Env = append(os.Environ(), "WAYLAND_DISPLAY="+waylandDisplay())
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("listing the shell's IPC targets: %w", err)
	}
	return parseOmarchyTargets(output), nil
}

func parseOmarchyTargets(output []byte) []types.OmarchyTarget {
	targets := []types.OmarchyTarget{}
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if match := ipcTarget.FindStringSubmatch(line); match != nil {
			targets = append(targets, types.OmarchyTarget{Name: match[1], Functions: []types.OmarchyFunction{}})
			continue
		}
		match := ipcFunction.FindStringSubmatch(line)
		if match == nil || len(targets) == 0 {
			continue
		}
		function := types.OmarchyFunction{Name: match[1], Arguments: []types.OmarchyArgument{}, Returns: match[3]}
		for argument := range strings.SplitSeq(match[2], ",") {
			if name, kind, ok := strings.Cut(strings.TrimSpace(argument), ":"); ok {
				function.Arguments = append(function.Arguments, types.OmarchyArgument{Name: strings.TrimSpace(name), Type: strings.TrimSpace(kind)})
			}
		}
		target := &targets[len(targets)-1]
		target.Functions = append(target.Functions, function)
	}
	for i := range targets {
		slices.SortFunc(targets[i].Functions, func(a, b types.OmarchyFunction) int {
			return strings.Compare(a.Name, b.Name)
		})
	}
	slices.SortFunc(targets, func(a, b types.OmarchyTarget) int {
		return strings.Compare(a.Name, b.Name)
	})
	return targets
}

func omarchyDefaultMenu() string {
	return filepath.Join(omarchyPath(), "default", "omarchy", "omarchy-menu.jsonc")
}

func omarchyUserMenu() string {
	return filepath.Join(os.Getenv("HOME"), ".config", "omarchy", "extensions", "omarchy-menu.jsonc")
}

var (
	jsoncComment       = regexp.MustCompile(`(?m)^\s*//[^\n]*(\n|$)`)
	jsoncTrailingComma = regexp.MustCompile(`,(\s*[}\]])`)
)

// omarchyMenus lists the Omarchy menu's routes, read the way the menu reads
// them: the default menu, then the user's extension over it
func omarchyMenus() []types.OmarchyMenu {
	type entry struct {
		Label   *string         `json:"label"`
		Action  *string         `json:"action"`
		Target  *string         `json:"target"`
		Aliases json.RawMessage `json:"aliases"`
	}
	merged := map[string]entry{"root": {Label: pointer("Omarchy menu")}}
	for _, path := range []string{omarchyDefaultMenu(), omarchyUserMenu()} {
		raw, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		stripped := jsoncTrailingComma.ReplaceAll(jsoncComment.ReplaceAll(raw, nil), []byte("$1"))
		var parsed map[string]json.RawMessage
		if err := json.Unmarshal(stripped, &parsed); err != nil {
			slog.Debug("Failed to read an Omarchy menu", "path", path, "error", err)
			continue
		}
		if items, ok := parsed["items"]; ok {
			var nested map[string]json.RawMessage
			if json.Unmarshal(items, &nested) == nil {
				parsed = nested
			}
		}
		for id, value := range parsed {
			var item entry
			if json.Unmarshal(value, &item) != nil {
				continue
			}
			prior := merged[id]
			item.Label = cmp.Or(item.Label, prior.Label)
			item.Action = cmp.Or(item.Action, prior.Action)
			item.Target = cmp.Or(item.Target, prior.Target)
			if item.Aliases == nil {
				item.Aliases = prior.Aliases
			}
			merged[id] = item
		}
	}

	menus := []types.OmarchyMenu{}
	for id, item := range merged {
		// Only rows without an action or a link open a menu
		if (item.Action != nil && *item.Action != "") || (item.Target != nil && *item.Target != "") {
			continue
		}
		name := id
		if item.Label != nil && *item.Label != "" {
			name = *item.Label
		}
		// Aliases are a list, or a single name
		aliases := []string{}
		var alias string
		if json.Unmarshal(item.Aliases, &aliases) != nil && json.Unmarshal(item.Aliases, &alias) == nil && alias != "" {
			aliases = []string{alias}
		}
		aliases = slices.DeleteFunc(aliases, func(alias string) bool { return alias == "" })
		menus = append(menus, types.OmarchyMenu{ID: id, Name: name, Aliases: aliases})
	}
	slices.SortFunc(menus, func(a, b types.OmarchyMenu) int {
		return strings.Compare(a.ID, b.ID)
	})
	return menus
}
