//go:build linux

package desktop

import (
	"bufio"
	"bytes"
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// Wayland has no protocol for keyboard layouts, so outside Hyprland they come
// from the compositor's own IPC, where it has one: Sway's and niri's. Both
// name layouts as xkb describes them, such as "English (UK)", rather than by
// their codes.

const compositorIPCTimeout = 2 * time.Second

// layoutIPC is a compositor's IPC for its keyboard layouts
type layoutIPC interface {
	// layouts are the keyboard's layouts and the index of the active one
	layouts(ctx context.Context) ([]string, int, error)
	switchTo(ctx context.Context, index int) error
	// follow calls changed whenever the layouts or the active one change,
	// until the compositor disconnects or ctx is done
	follow(ctx context.Context, changed func()) error
}

// compositorLayouts is the running compositor's layout IPC, or nil when it
// has none System Bridge knows
func compositorLayouts() layoutIPC {
	if socket := compositorSocket("SWAYSOCK", "sway-ipc.*.sock"); socket != "" {
		return swayIPC{socket: socket}
	}
	if socket := compositorSocket("NIRI_SOCKET", "niri.*.sock"); socket != "" {
		return niriIPC{socket: socket}
	}
	return nil
}

// compositorSocket is the socket in the environment variable, or the newest
// matching one in the runtime directory when the backend started outside the
// session
func compositorSocket(variable string, pattern string) string {
	if socket := os.Getenv(variable); socket != "" {
		return socket
	}
	matches, _ := filepath.Glob(filepath.Join(runtimeDir(), pattern))
	newest, newestTime := "", time.Time{}
	for _, match := range matches {
		info, err := os.Stat(match)
		if err != nil || info.Mode()&os.ModeSocket == 0 {
			continue
		}
		if newest == "" || info.ModTime().After(newestTime) {
			newest, newestTime = match, info.ModTime()
		}
	}
	return newest
}

// compositorKeyboard reads the keyboard's layouts from the compositor's IPC,
// or reports none
func compositorKeyboard() types.DesktopKeyboard {
	keyboard := types.DesktopKeyboard{Layouts: []string{}}
	ipc := compositorLayouts()
	if ipc == nil {
		return keyboard
	}
	ctx, cancel := context.WithTimeout(context.Background(), compositorIPCTimeout)
	defer cancel()
	names, active, err := ipc.layouts(ctx)
	if err != nil {
		return keyboard
	}
	keyboard.Layouts = names
	if active >= 0 && active < len(names) {
		keyboard.Layout = pointer(names[active])
		keyboard.Name = pointer(names[active])
	}
	return keyboard
}

// swayIPC is Sway's i3-style IPC: messages framed with a magic string, the
// payload's length and its type
type swayIPC struct {
	socket string
}

const (
	swayRunCommand uint32 = 0
	swaySubscribe  uint32 = 2
	swayGetInputs  uint32 = 100
	// swayInputEvent is the input event's type, with the high bit events have
	swayInputEvent uint32 = 0x80000015
)

var swayMagic = []byte("i3-ipc")

func swayMessage(messageType uint32, payload []byte) []byte {
	message := bytes.Clone(swayMagic)
	message = binary.LittleEndian.AppendUint32(message, uint32(len(payload)))
	message = binary.LittleEndian.AppendUint32(message, messageType)
	return append(message, payload...)
}

func readSwayMessage(reader io.Reader) (uint32, []byte, error) {
	header := make([]byte, len(swayMagic)+8)
	if _, err := io.ReadFull(reader, header); err != nil {
		return 0, nil, err
	}
	if !bytes.Equal(header[:len(swayMagic)], swayMagic) {
		return 0, nil, errors.New("not a Sway IPC message")
	}
	length := binary.LittleEndian.Uint32(header[len(swayMagic):])
	messageType := binary.LittleEndian.Uint32(header[len(swayMagic)+4:])
	payload := make([]byte, length)
	if _, err := io.ReadFull(reader, payload); err != nil {
		return 0, nil, err
	}
	return messageType, payload, nil
}

// request sends one message and reads its reply
func (s swayIPC) request(ctx context.Context, messageType uint32, payload []byte) ([]byte, error) {
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", s.socket)
	if err != nil {
		return nil, err
	}
	defer func() { _ = conn.Close() }()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}
	if _, err := conn.Write(swayMessage(messageType, payload)); err != nil {
		return nil, err
	}
	_, reply, err := readSwayMessage(conn)
	return reply, err
}

// parseSwayInputs reads the first keyboard's layouts from GET_INPUTS' reply
func parseSwayInputs(payload []byte) ([]string, int, error) {
	var inputs []struct {
		Type         string   `json:"type"`
		LayoutNames  []string `json:"xkb_layout_names"`
		ActiveLayout int      `json:"xkb_active_layout_index"`
	}
	if err := json.Unmarshal(payload, &inputs); err != nil {
		return nil, 0, err
	}
	for _, input := range inputs {
		if input.Type == "keyboard" && len(input.LayoutNames) > 0 {
			return input.LayoutNames, input.ActiveLayout, nil
		}
	}
	return nil, 0, errors.New("no keyboard with layouts")
}

func (s swayIPC) layouts(ctx context.Context) ([]string, int, error) {
	reply, err := s.request(ctx, swayGetInputs, nil)
	if err != nil {
		return nil, 0, err
	}
	return parseSwayInputs(reply)
}

func (s swayIPC) switchTo(ctx context.Context, index int) error {
	reply, err := s.request(ctx, swayRunCommand, []byte("input type:keyboard xkb_switch_layout "+strconv.Itoa(index)))
	if err != nil {
		return err
	}
	var results []struct {
		Success bool   `json:"success"`
		Error   string `json:"error"`
	}
	if err := json.Unmarshal(reply, &results); err != nil {
		return err
	}
	for _, result := range results {
		if !result.Success {
			return fmt.Errorf("sway: %s", result.Error)
		}
	}
	return nil
}

// swayLayoutChanged reports whether an input event is about a keyboard's
// layouts
func swayLayoutChanged(payload []byte) bool {
	var event struct {
		Change string `json:"change"`
	}
	if json.Unmarshal(payload, &event) != nil {
		return false
	}
	return event.Change == "xkb_layout" || event.Change == "xkb_keymap" || event.Change == "added" || event.Change == "removed"
}

func (s swayIPC) follow(ctx context.Context, changed func()) error {
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", s.socket)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	if _, err := conn.Write(swayMessage(swaySubscribe, []byte(`["input"]`))); err != nil {
		return err
	}
	for {
		messageType, payload, err := readSwayMessage(conn)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		if messageType == swayInputEvent && swayLayoutChanged(payload) {
			changed()
		}
	}
}

// niriIPC is niri's IPC: a JSON request per line, answered by a JSON reply
type niriIPC struct {
	socket string
}

// niriRequest sends one request and decodes the reply's Ok value into v
func (n niriIPC) request(ctx context.Context, request any, v any) error {
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", n.socket)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}
	encoded, err := json.Marshal(request)
	if err != nil {
		return err
	}
	if _, err := conn.Write(append(encoded, '\n')); err != nil {
		return err
	}
	line, err := bufio.NewReader(conn).ReadBytes('\n')
	if err != nil {
		return err
	}
	return parseNiriReply(line, v)
}

// parseNiriReply decodes a reply's Ok value into v, or returns its Err
func parseNiriReply(line []byte, v any) error {
	var reply struct {
		Ok  json.RawMessage `json:"Ok"`
		Err *string         `json:"Err"`
	}
	if err := json.Unmarshal(line, &reply); err != nil {
		return err
	}
	if reply.Err != nil {
		return fmt.Errorf("niri: %s", *reply.Err)
	}
	if v == nil {
		return nil
	}
	return json.Unmarshal(reply.Ok, v)
}

func (n niriIPC) layouts(ctx context.Context) ([]string, int, error) {
	var ok struct {
		KeyboardLayouts struct {
			Names      []string `json:"names"`
			CurrentIdx int      `json:"current_idx"`
		} `json:"KeyboardLayouts"`
	}
	if err := n.request(ctx, "KeyboardLayouts", &ok); err != nil {
		return nil, 0, err
	}
	return ok.KeyboardLayouts.Names, ok.KeyboardLayouts.CurrentIdx, nil
}

func (n niriIPC) switchTo(ctx context.Context, index int) error {
	return n.request(ctx, map[string]any{
		"Action": map[string]any{
			"SwitchLayout": map[string]any{"layout": map[string]any{"Index": index}},
		},
	}, nil)
}

// niriLayoutChanged reports whether an event stream line is about the
// keyboard's layouts
func niriLayoutChanged(line []byte) bool {
	var event map[string]json.RawMessage
	if json.Unmarshal(line, &event) != nil {
		return false
	}
	_, changed := event["KeyboardLayoutsChanged"]
	_, switched := event["KeyboardLayoutSwitched"]
	return changed || switched
}

func (n niriIPC) follow(ctx context.Context, changed func()) error {
	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", n.socket)
	if err != nil {
		return err
	}
	defer func() { _ = conn.Close() }()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()

	if _, err := conn.Write([]byte("\"EventStream\"\n")); err != nil {
		return err
	}
	scanner := bufio.NewScanner(conn)
	scanner.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	// The first line answers the request; the events follow it
	if scanner.Scan() {
		if err := parseNiriReply(scanner.Bytes(), nil); err != nil {
			return err
		}
	}
	for scanner.Scan() {
		if niriLayoutChanged(scanner.Bytes()) {
			changed()
		}
	}
	if ctx.Err() != nil {
		return nil
	}
	if err := scanner.Err(); err != nil {
		return err
	}
	return errors.New("niri closed the event stream")
}
