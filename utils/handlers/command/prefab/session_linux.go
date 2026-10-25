//go:build linux

package prefab

import (
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/utils/wayland"
)

// The backend can start outside the desktop session, such as from systemd, so
// these find the session from what's running when its environment doesn't
// say

// desktop is the running desktop, such as hyprland, kde or gnome, or empty
// when it can't tell
func desktop() string {
	for _, name := range strings.Split(strings.ToLower(os.Getenv("XDG_CURRENT_DESKTOP")), ":") {
		switch name {
		case "hyprland", "kde", "gnome":
			return name
		}
	}
	if hyprlandSignature() != "" {
		return "hyprland"
	}
	switch {
	case processRunning("plasmashell"):
		return "kde"
	case processRunning("gnome-shell"):
		return "gnome"
	}
	return ""
}

func onWayland() bool {
	_, err := wayland.Socket()
	return err == nil
}

func onHyprland() bool { return desktop() == "hyprland" }
func onKDE() bool      { return desktop() == "kde" }
func onGNOME() bool    { return desktop() == "gnome" }

// onWlroots is a Wayland session on a compositor grim can capture, which
// GNOME and KDE aren't
func onWlroots() bool {
	if !onWayland() {
		return false
	}
	switch desktop() {
	case "kde", "gnome":
		return false
	}
	return true
}

// x11Display is DISPLAY, or the first X server's when it isn't set
func x11Display() string {
	if display := os.Getenv("DISPLAY"); display != "" {
		return display
	}
	if _, err := os.Stat("/tmp/.X11-unix/X0"); err == nil {
		return ":0"
	}
	return ""
}

// onX11 is an X11 session with no Wayland compositor, for the X11 tools
func onX11() bool {
	if onWayland() {
		return false
	}
	return x11Display() != ""
}

// processRunning reports whether a process with this name is running
func processRunning(name string) bool {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return false
	}
	for _, entry := range entries {
		comm, err := os.ReadFile(filepath.Join("/proc", entry.Name(), "comm"))
		if err == nil && strings.TrimSpace(string(comm)) == name {
			return true
		}
	}
	return false
}

// hyprlandSignature is HYPRLAND_INSTANCE_SIGNATURE, or the newest running
// instance's when it isn't set, found the way the desktop module finds it
func hyprlandSignature() string {
	if signature := os.Getenv("HYPRLAND_INSTANCE_SIGNATURE"); signature != "" {
		return signature
	}
	runtimeDir := os.Getenv("XDG_RUNTIME_DIR")
	if runtimeDir == "" {
		return ""
	}
	base := filepath.Join(runtimeDir, "hypr")
	entries, err := os.ReadDir(base)
	if err != nil {
		return ""
	}
	newest := ""
	var newestTime time.Time
	for _, entry := range entries {
		info, err := os.Stat(filepath.Join(base, entry.Name(), ".socket2.sock"))
		if err != nil {
			continue
		}
		if newest == "" || info.ModTime().After(newestTime) {
			newest, newestTime = entry.Name(), info.ModTime()
		}
	}
	return newest
}

// sessionEnv is the environment for a program a prefab runs, adding the
// session's Wayland or X11 display and Hyprland instance when the backend
// doesn't have them
func sessionEnv() []string {
	env := os.Environ()
	if os.Getenv("DISPLAY") == "" {
		if display := x11Display(); display != "" {
			env = append(env, "DISPLAY="+display)
		}
	}
	if os.Getenv("WAYLAND_DISPLAY") == "" {
		if socket, err := wayland.Socket(); err == nil {
			env = append(env, "WAYLAND_DISPLAY="+socket)
		}
	}
	if os.Getenv("HYPRLAND_INSTANCE_SIGNATURE") == "" {
		if signature := hyprlandSignature(); signature != "" {
			env = append(env, "HYPRLAND_INSTANCE_SIGNATURE="+signature)
		}
	}
	return env
}
