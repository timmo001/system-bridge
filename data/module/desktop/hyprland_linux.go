//go:build linux

package desktop

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// hyprlandTimeout limits each request, as Hyprland handles its request socket
// synchronously and freezes until the connection closes
const hyprlandTimeout = 2 * time.Second

var errNoHyprland = errors.New("Hyprland isn't running")

// hyprlandDir is the running Hyprland instance's socket directory. The backend
// can start outside Hyprland's environment, such as from systemd, so without
// HYPRLAND_INSTANCE_SIGNATURE it uses the newest instance.
func hyprlandDir() (string, error) {
	runtimeDir := os.Getenv("XDG_RUNTIME_DIR")
	if runtimeDir == "" {
		return "", errors.New("XDG_RUNTIME_DIR is not set")
	}
	base := filepath.Join(runtimeDir, "hypr")
	if signature := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE"); signature != "" {
		dir := filepath.Join(base, signature)
		if _, err := os.Stat(filepath.Join(dir, ".socket2.sock")); err != nil {
			return "", errNoHyprland
		}
		return dir, nil
	}

	entries, err := os.ReadDir(base)
	if err != nil {
		return "", errNoHyprland
	}
	newest := ""
	var newestTime time.Time
	for _, entry := range entries {
		info, err := os.Stat(filepath.Join(base, entry.Name(), ".socket2.sock"))
		if err != nil {
			continue
		}
		if newest == "" || info.ModTime().After(newestTime) {
			newest, newestTime = filepath.Join(base, entry.Name()), info.ModTime()
		}
	}
	if newest == "" {
		return "", errNoHyprland
	}
	return newest, nil
}

// hyprlandRequest sends one request to Hyprland's request socket and returns
// its reply
func hyprlandRequest(ctx context.Context, dir string, request string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(ctx, hyprlandTimeout)
	defer cancel()

	conn, err := (&net.Dialer{}).DialContext(ctx, "unix", filepath.Join(dir, ".socket.sock"))
	if err != nil {
		return nil, err
	}
	defer func() { _ = conn.Close() }()
	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	}

	if _, err := conn.Write([]byte(request)); err != nil {
		return nil, err
	}
	return io.ReadAll(conn)
}

// hyprlandBatch sends the JSON requests in a single batch and returns each
// reply in order. Replies after one that isn't JSON, such as a request this
// Hyprland doesn't know, are nil, so requests that can fail go last.
func hyprlandBatch(ctx context.Context, dir string, requests ...string) ([]json.RawMessage, error) {
	response, err := hyprlandRequest(ctx, dir, "[[BATCH]]j/"+strings.Join(requests, ";j/"))
	if err != nil {
		return nil, err
	}

	replies := make([]json.RawMessage, len(requests))
	decoder := json.NewDecoder(bytes.NewReader(response))
	for i := range replies {
		if err := decoder.Decode(&replies[i]); err != nil {
			replies[i] = nil
			break
		}
	}
	return replies, nil
}

// hyprlandAddress is a window address as clients reports it. Events give it in
// hex without the 0x.
func hyprlandAddress(address string) string {
	if address == "" || strings.HasPrefix(address, "0x") {
		return address
	}
	return "0x" + address
}
