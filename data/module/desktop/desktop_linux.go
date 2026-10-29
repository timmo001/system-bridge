//go:build linux

package desktop

import (
	"bufio"
	"context"
	"log/slog"
	"net"
	"path/filepath"
	"reflect"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the events one change makes, such as switching
// workspaces, into a single batch of requests
const watchDebounce = 100 * time.Millisecond

// watchRetry is how long to wait before following Hyprland again, such as
// after it restarts or when it isn't running
const watchRetry = 30 * time.Second

// refreshEvents are the Hyprland events that change what its requests report.
// windowtitlev2 only matters with window titles on.
var refreshEvents = map[string]bool{
	"activelayout":       true,
	"activespecialv2":    true,
	"activewindowv2":     true,
	"changefloatingmode": true,
	"changeworkspaceid":  true,
	"closelayer":         true,
	"closewindow":        true,
	"configreloaded":     true,
	"createworkspacev2":  true,
	"destroyworkspacev2": true,
	"focusedmonv2":       true,
	"fullscreen":         true,
	"minimized":          true,
	"monitoraddedv2":     true,
	"monitorremovedv2":   true,
	"moveintogroup":      true,
	"moveoutofgroup":     true,
	"movewindowv2":       true,
	"moveworkspacev2":    true,
	"openlayer":          true,
	"openwindow":         true,
	"pin":                true,
	"renameworkspace":    true,
	"togglegroup":        true,
	"urgent":             true,
	"workspacev2":        true,
}

// hyprland keeps what Hyprland last reported. While its events are followed,
// the module's updates use it rather than asking Hyprland again.
type hyprland struct {
	mu        sync.Mutex
	following bool
	events    hyprlandEvents
	config    *hyprlandConfig // nil until read, and again after the config reloads
	state     *hyprlandState
	data      *types.DesktopData
	titles    bool // Whether data has window titles
}

var hyprlandSource = &hyprland{events: newHyprlandEvents()}

// Get reports the desktop, or nil when no supported compositor is running
func Get(ctx context.Context) (*types.DesktopData, error) {
	titles := windowTitlesEnabled()

	if _, err := hyprlandDir(); err != nil {
		return waylandSource.get(titles)
	}

	hyprlandSource.mu.Lock()
	defer hyprlandSource.mu.Unlock()
	if hyprlandSource.following && hyprlandSource.data != nil && hyprlandSource.titles == titles {
		return hyprlandSource.data, nil
	}
	return hyprlandSource.refresh(ctx, titles, true)
}

// refresh rebuilds the module's data, first asking Hyprland again when read is
// set or nothing has been read yet. h.mu must be held.
func (h *hyprland) refresh(ctx context.Context, titles bool, read bool) (*types.DesktopData, error) {
	dir, err := hyprlandDir()
	if err != nil {
		h.state, h.data = nil, nil
		return nil, nil
	}

	if read || h.state == nil || h.config == nil {
		var state hyprlandState
		var config hyprlandConfig
		requests := slices.Clone(hyprlandStateRequests)
		targets := state.targets()
		optional := 0
		if h.config == nil {
			requests = append(requests, hyprlandConfigRequests...)
			targets = append(targets, config.targets()...)
			optional = hyprlandConfigOptional
		}

		replies, err := hyprlandBatch(ctx, dir, requests...)
		if err != nil {
			return nil, err
		}
		if err := decodeReplies(replies, targets, optional); err != nil {
			return nil, err
		}
		h.state = &state
		if h.config == nil {
			h.config = &config
		}
	}

	data := buildHyprland(*h.state, *h.config, h.events, titles)
	data.Omarchy = omarchySource.get(ctx)
	h.data, h.titles = &data, titles
	return h.data, nil
}

// forgetConfig makes the next update read Hyprland's config again, such as
// after an option is set, which sends no event
func (h *hyprland) forgetConfig() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.config, h.data = nil, nil
}

// Watch calls changed whenever the desktop changes, until ctx is done. It
// follows Hyprland's events, or other Wayland compositors' when Hyprland isn't
// running.
func Watch(ctx context.Context, changed func()) {
	// Set when an event changes what Hyprland's requests report, rather than
	// only what its events do
	var read atomic.Bool
	check := func() {
		titles := windowTitlesEnabled()

		hyprlandSource.mu.Lock()
		before := hyprlandSource.data
		after, err := hyprlandSource.refresh(ctx, titles, read.Swap(false))
		hyprlandSource.mu.Unlock()

		if err != nil {
			slog.Debug("Failed to read the desktop from Hyprland", "error", err)
			return
		}
		if !reflect.DeepEqual(before, after) {
			changed()
		}
	}
	trigger, stop := watch.Debounce(watchDebounce, check)
	defer stop()

	watch.Retry(ctx, watchRetry, "desktop", func(ctx context.Context) error {
		if _, err := hyprlandDir(); err != nil {
			return waylandSource.follow(ctx, changed)
		}
		return hyprlandSource.follow(ctx, func(needsRead bool) {
			if needsRead {
				read.Store(true)
			}
			trigger()
		})
	})
}

// follow reads Hyprland's events until it stops or ctx is done
func (h *hyprland) follow(ctx context.Context, trigger func(read bool)) error {
	dir, err := hyprlandDir()
	if err != nil {
		return err
	}
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", filepath.Join(dir, ".socket2.sock"))
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	h.mu.Lock()
	h.following, h.events, h.config = true, newHyprlandEvents(), nil
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		h.following, h.events = false, newHyprlandEvents()
		h.mu.Unlock()
	}()

	// The desktop may have changed while the events weren't followed
	trigger(true)

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		name, data, _ := strings.Cut(scanner.Text(), ">>")
		if name == "custom" {
			if listener := hyprlandEventListener.Load(); listener != nil {
				(*listener)(types.HyprlandEvent{Data: data})
			}
			continue
		}

		h.mu.Lock()
		changed := h.events.handle(name, data)
		titles := h.titles
		if name == "configreloaded" {
			h.config = nil
		}
		h.mu.Unlock()

		switch {
		case refreshEvents[name], name == "windowtitlev2" && titles:
			trigger(true)
		case changed:
			trigger(false)
		}
	}
	if ctx.Err() != nil {
		return nil
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	return errNoHyprland
}
