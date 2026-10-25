//go:build windows

package prefab

import (
	"context"
	"fmt"
	"strconv"

	"github.com/vcaesar/screenshot"
)

// listMonitors is Windows' active displays, numbered from 1
func listMonitors() []monitor {
	count := screenshot.NumActiveDisplays()
	monitors := make([]monitor, 0, count)
	for i := range count {
		id := strconv.Itoa(i + 1)
		monitors = append(monitors, monitor{ID: id, Label: monitorLabel(id)})
	}
	return monitors
}

func monitorLabel(id string) string { return "display " + id }

// monitorBuiltin captures one display's bounds
func monitorBuiltin(id string) Builtin {
	return func(_ context.Context, arguments []string) error {
		number, err := strconv.Atoi(id)
		if err != nil || number < 1 || number > screenshot.NumActiveDisplays() {
			return fmt.Errorf("%s isn't connected", monitorLabel(id))
		}
		return captureTo(screenshot.GetDisplayBounds(number-1), arguments)
	}
}
