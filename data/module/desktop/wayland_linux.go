//go:build linux

package desktop

import (
	"cmp"
	"context"
	"errors"
	"reflect"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
	"github.com/timmo001/system-bridge/utils/wayland"
)

// Other Wayland compositors report their windows through
// wlr-foreign-toplevel-management and their workspaces through ext-workspace,
// over one connection that their events keep up to date

const waylandTimeout = 2 * time.Second

var errNoToplevels = errors.New("the compositor doesn't support wlr-foreign-toplevel-management")

// The toplevel handle's states
const (
	toplevelMaximised  = 0
	toplevelMinimised  = 1
	toplevelActivated  = 2
	toplevelFullscreen = 3
)

// The workspace's states
const (
	workspaceActive = 1
	workspaceHidden = 4
)

type waylandOutput struct {
	global uint32 // The registry name, to know when it's removed
	name   string
}

type waylandToplevel struct {
	seq     uint64 // The ID System Bridge gives it
	title   string
	app     string
	outputs []uint32
	states  []uint32
}

type waylandGroup struct {
	outputs []uint32
}

type waylandWorkspace struct {
	seq   uint64
	id    string // The compositor's own ID, when it gives one
	name  string
	group uint32
	state uint32
}

// waylandState is what the compositor has told one connection
type waylandState struct {
	nextObject uint32
	nextSeq    uint64

	outputs    map[uint32]*waylandOutput
	toplevels  map[uint32]*waylandToplevel
	groups     map[uint32]*waylandGroup
	workspaces map[uint32]*waylandWorkspace

	toplevelManager  uint32
	workspaceManager uint32
}

func newWaylandState() *waylandState {
	return &waylandState{
		nextObject: wayland.FirstFreeID,
		outputs:    map[uint32]*waylandOutput{},
		toplevels:  map[uint32]*waylandToplevel{},
		groups:     map[uint32]*waylandGroup{},
		workspaces: map[uint32]*waylandWorkspace{},
	}
}

func (s *waylandState) newObject() uint32 {
	id := s.nextObject
	s.nextObject++
	return id
}

func (s *waylandState) newSeq() uint64 {
	s.nextSeq++
	return s.nextSeq
}

// bindOutput binds a wl_output, at version 4 for its name
func (s *waylandState) bindOutput(global wayland.Global) []byte {
	id := s.newObject()
	s.outputs[id] = &waylandOutput{global: global.Name}
	return wayland.Message(wayland.RegistryID, 0,
		wayland.Bind(global.Name, "wl_output", min(global.Version, 4), id)...)
}

// setup binds the outputs and the managers, and returns the requests to send
func (s *waylandState) setup(conn *wayland.Conn) ([]byte, error) {
	toplevels, ok := conn.Globals["zwlr_foreign_toplevel_manager_v1"]
	if !ok {
		return nil, errNoToplevels
	}

	var requests []byte
	for _, output := range conn.Outputs {
		requests = append(requests, s.bindOutput(output)...)
	}
	s.toplevelManager = s.newObject()
	requests = append(requests, wayland.Message(wayland.RegistryID, 0,
		wayland.Bind(toplevels.Name, "zwlr_foreign_toplevel_manager_v1", min(toplevels.Version, 3), s.toplevelManager)...)...)
	if workspaces, ok := conn.Globals["ext_workspace_manager_v1"]; ok {
		s.workspaceManager = s.newObject()
		requests = append(requests, wayland.Message(wayland.RegistryID, 0,
			wayland.Bind(workspaces.Name, "ext_workspace_manager_v1", 1, s.workspaceManager)...)...)
	}
	return requests, nil
}

// handle applies an event, and returns any requests to send in reply
func (s *waylandState) handle(object uint32, opcode uint16, body []byte) ([]byte, error) {
	args := wayland.Args(body)

	switch {
	case object == wayland.DisplayID && opcode == 0:
		return nil, errors.New("the compositor reported a Wayland protocol error")

	case object == wayland.RegistryID:
		switch opcode {
		case 0: // global
			global, iface, ok := wayland.ParseGlobal(body)
			if ok && iface == "wl_output" {
				return s.bindOutput(global), nil
			}
		case 1: // global_remove
			name, _ := args.Uint()
			for id, output := range s.outputs {
				if output.global == name {
					delete(s.outputs, id)
				}
			}
		}

	case object == s.toplevelManager:
		switch opcode {
		case 0: // toplevel
			if id, ok := args.Uint(); ok {
				s.toplevels[id] = &waylandToplevel{seq: s.newSeq()}
			}
		case 1: // finished
			return nil, errors.New("the compositor stopped sending toplevels")
		}

	case object == s.workspaceManager && s.workspaceManager != 0:
		switch opcode {
		case 0: // workspace_group
			if id, ok := args.Uint(); ok {
				s.groups[id] = &waylandGroup{}
			}
		case 1: // workspace
			if id, ok := args.Uint(); ok {
				s.workspaces[id] = &waylandWorkspace{seq: s.newSeq()}
			}
		}

	case s.outputs[object] != nil:
		if opcode == 4 { // name
			s.outputs[object].name, _ = args.String()
		}

	case s.toplevels[object] != nil:
		toplevel := s.toplevels[object]
		switch opcode {
		case 0: // title
			toplevel.title, _ = args.String()
		case 1: // app_id
			toplevel.app, _ = args.String()
		case 2: // output_enter
			if output, ok := args.Uint(); ok && !slices.Contains(toplevel.outputs, output) {
				toplevel.outputs = append(toplevel.outputs, output)
			}
		case 3: // output_leave
			if output, ok := args.Uint(); ok {
				toplevel.outputs = slices.DeleteFunc(toplevel.outputs, func(id uint32) bool { return id == output })
			}
		case 4: // state
			toplevel.states = arrayUints(&args)
		case 6: // closed
			delete(s.toplevels, object)
			return wayland.Message(object, 7), nil // destroy
		}

	case s.groups[object] != nil:
		group := s.groups[object]
		switch opcode {
		case 1: // output_enter
			if output, ok := args.Uint(); ok && !slices.Contains(group.outputs, output) {
				group.outputs = append(group.outputs, output)
			}
		case 2: // output_leave
			if output, ok := args.Uint(); ok {
				group.outputs = slices.DeleteFunc(group.outputs, func(id uint32) bool { return id == output })
			}
		case 3: // workspace_enter
			if id, ok := args.Uint(); ok && s.workspaces[id] != nil {
				s.workspaces[id].group = object
			}
		case 4: // workspace_leave
			if id, ok := args.Uint(); ok && s.workspaces[id] != nil && s.workspaces[id].group == object {
				s.workspaces[id].group = 0
			}
		case 5: // removed
			delete(s.groups, object)
			return wayland.Message(object, 1), nil // destroy
		}

	case s.workspaces[object] != nil:
		workspace := s.workspaces[object]
		switch opcode {
		case 0: // id
			workspace.id, _ = args.String()
		case 1: // name
			workspace.name, _ = args.String()
		case 3: // state
			workspace.state, _ = args.Uint()
		case 5: // removed
			delete(s.workspaces, object)
			return wayland.Message(object, 0), nil // destroy
		}
	}
	return nil, nil
}

// arrayUints reads an array argument of uints
func arrayUints(args *wayland.Args) []uint32 {
	data, ok := args.Array()
	if !ok {
		return nil
	}
	items := wayland.Args(data)
	var values []uint32
	for {
		value, ok := items.Uint()
		if !ok {
			return values
		}
		values = append(values, value)
	}
}

// outputName is an output's name, the displays module's id
func (s *waylandState) outputName(outputs []uint32) *string {
	for _, id := range outputs {
		if output := s.outputs[id]; output != nil && output.name != "" {
			return pointer(output.name)
		}
	}
	return nil
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

// build is the module's data from what the compositor reported
func (s *waylandState) build(titles bool) types.DesktopData {
	data := types.DesktopData{
		Compositor: types.DesktopCompositorWayland,
		Keyboard:   types.DesktopKeyboard{Layouts: []string{}},
		Windows:    []types.DesktopWindow{},
		Workspaces: []types.DesktopWorkspace{},
	}

	toplevels := make([]*waylandToplevel, 0, len(s.toplevels))
	for _, toplevel := range s.toplevels {
		toplevels = append(toplevels, toplevel)
	}
	slices.SortFunc(toplevels, func(a, b *waylandToplevel) int { return cmp.Compare(a.seq, b.seq) })

	var focusedDisplay *string
	for _, toplevel := range toplevels {
		window := types.DesktopWindow{
			ID:         strconv.FormatUint(toplevel.seq, 10),
			App:        optionalString(toplevel.app),
			Display:    s.outputName(toplevel.outputs),
			Focused:    slices.Contains(toplevel.states, toplevelActivated),
			Fullscreen: pointer(slices.Contains(toplevel.states, toplevelFullscreen)),
			Maximised:  pointer(slices.Contains(toplevel.states, toplevelMaximised)),
			Minimised:  pointer(slices.Contains(toplevel.states, toplevelMinimised)),
		}
		if titles {
			window.Title = optionalString(toplevel.title)
		}
		if window.Focused {
			data.FocusedWindow = pointer(window.ID)
			focusedDisplay = window.Display
		}
		data.Windows = append(data.Windows, window)
	}

	workspaces := make([]*waylandWorkspace, 0, len(s.workspaces))
	for _, workspace := range s.workspaces {
		if workspace.state&workspaceHidden == 0 {
			workspaces = append(workspaces, workspace)
		}
	}
	slices.SortFunc(workspaces, func(a, b *waylandWorkspace) int { return cmp.Compare(a.seq, b.seq) })

	var active []int
	for _, workspace := range workspaces {
		id := workspace.id
		if id == "" {
			id = strconv.FormatUint(workspace.seq, 10)
		}
		var display *string
		if group := s.groups[workspace.group]; group != nil {
			display = s.outputName(group.outputs)
		}
		if workspace.state&workspaceActive != 0 {
			active = append(active, len(data.Workspaces))
		}
		data.Workspaces = append(data.Workspaces, types.DesktopWorkspace{
			ID:      id,
			Name:    optionalString(workspace.name),
			Display: display,
			Active:  workspace.state&workspaceActive != 0,
		})
	}

	// The focused workspace is the one shown where the focused window is, or
	// the only one shown
	focused := -1
	for _, index := range active {
		if focusedDisplay != nil && data.Workspaces[index].Display != nil && *data.Workspaces[index].Display == *focusedDisplay {
			focused = index
		}
	}
	if focused == -1 && len(active) == 1 {
		focused = active[0]
	}
	if focused != -1 {
		data.Workspaces[focused].Focused = true
		data.FocusedWorkspace = pointer(data.Workspaces[focused].ID)
	}
	return data
}

// waylandDesktop keeps what the compositor last reported. While its events
// are followed, the module's updates use it rather than asking again.
type waylandDesktop struct {
	mu     sync.Mutex
	state  *waylandState // Only while following
	data   *types.DesktopData
	titles bool
}

var waylandSource = &waylandDesktop{}

// get reports the desktop, or nil when the compositor doesn't report its
// windows
func (w *waylandDesktop) get(titles bool) (*types.DesktopData, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.state != nil {
		return w.refresh(titles), nil
	}

	state, err := waylandRead()
	if errors.Is(err, errNoToplevels) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	data := state.build(titles)
	return &data, nil
}

// refresh rebuilds the module's data when titles changed or it isn't built.
// w.mu must be held and w.state set.
func (w *waylandDesktop) refresh(titles bool) *types.DesktopData {
	if w.data == nil || w.titles != titles {
		data := w.state.build(titles)
		w.data, w.titles = &data, titles
	}
	return w.data
}

// waylandRead connects, reads what the compositor reports once, and
// disconnects
func waylandRead() (*waylandState, error) {
	conn, err := wayland.Connect(waylandTimeout)
	if err != nil {
		return nil, err
	}
	defer func() { _ = conn.Close() }()
	if err := conn.SetDeadline(time.Now().Add(waylandTimeout)); err != nil {
		return nil, err
	}

	state := newWaylandState()
	requests, err := state.setup(conn)
	if err != nil {
		return nil, err
	}
	// wl_display.sync, which is done once the compositor has sent everything
	// binding the managers makes it send
	callback := state.newObject()
	requests = append(requests, wayland.Message(wayland.DisplayID, 0, wayland.Uint(callback))...)
	if _, err := conn.Write(requests); err != nil {
		return nil, err
	}

	for {
		object, opcode, body, err := wayland.ReadMessage(conn.Reader)
		if err != nil {
			return nil, err
		}
		if object == callback && opcode == 0 {
			return state, nil
		}
		reply, err := state.handle(object, opcode, body)
		if err != nil {
			return nil, err
		}
		if reply != nil {
			if _, err := conn.Write(reply); err != nil {
				return nil, err
			}
		}
	}
}

// follow reads the compositor's events until it disconnects or ctx is done,
// calling changed whenever the module's data changes
func (w *waylandDesktop) follow(ctx context.Context, changed func()) error {
	conn, err := wayland.Connect(waylandTimeout)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	state := newWaylandState()
	requests, err := state.setup(conn)
	if err != nil {
		return err
	}
	if _, err := conn.Write(requests); err != nil {
		return err
	}

	w.mu.Lock()
	w.state, w.data = state, nil
	w.mu.Unlock()
	defer func() {
		w.mu.Lock()
		w.state, w.data = nil, nil
		w.mu.Unlock()
	}()

	// Groups what one change sends, such as a window's title, app and states
	check := func() {
		titles := windowTitlesEnabled()

		w.mu.Lock()
		if w.state != state {
			w.mu.Unlock()
			return
		}
		before := w.data
		w.data = nil
		after := w.refresh(titles)
		w.mu.Unlock()

		if !reflect.DeepEqual(before, after) {
			changed()
		}
	}
	trigger, stopDebounce := watch.Debounce(watchDebounce, check)
	defer stopDebounce()

	for {
		object, opcode, body, err := wayland.ReadMessage(conn.Reader)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}

		w.mu.Lock()
		reply, err := state.handle(object, opcode, body)
		w.mu.Unlock()
		if err != nil {
			return err
		}
		if reply != nil {
			if _, err := conn.Write(reply); err != nil {
				return err
			}
		}
		trigger()
	}
}
