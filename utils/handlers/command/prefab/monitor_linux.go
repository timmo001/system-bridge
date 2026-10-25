//go:build linux

package prefab

import (
	"time"

	"github.com/timmo001/system-bridge/utils/wayland"
)

// listMonitors is the Wayland compositor's outputs, named as grim takes them
func listMonitors() []monitor {
	names, err := wayland.OutputNames(2 * time.Second)
	if err != nil {
		return nil
	}
	monitors := make([]monitor, 0, len(names))
	for _, name := range names {
		monitors = append(monitors, monitor{ID: name, Label: name})
	}
	return monitors
}

func monitorLabel(id string) string { return id }

// Linux captures a monitor with grim, so it has no built-in
func monitorBuiltin(string) Builtin { return nil }
