package prefab

import (
	"fmt"
	"slices"
	"strings"
)

// monitorPrefix starts the ID of a screenshot of one monitor, which ends in
// the monitor's ID, such as screenshot-monitor:DP-1
const monitorPrefix = "screenshot-monitor:"

// monitor is a display a screenshot can capture on its own
type monitor struct {
	ID    string
	Label string
}

// monitorPrefab is the screenshot of one monitor. It stays valid while the
// monitor is unplugged, and says so when it runs.
func monitorPrefab(id string) Prefab {
	label := monitorLabel(id)
	return Prefab{
		ID:          monitorPrefix + id,
		Name:        "Screenshot of " + label,
		Description: "Capture " + label + " to a file and return its path",
		candidates: map[string][]candidate{
			"linux": {{program: "grim", arguments: []string{"-o", id, outputPlaceholder}, when: onWlroots}},
		},
		builtin:          monitorBuiltin(id),
		builtinArguments: []string{outputPlaceholder},
		check: func() error {
			if !slices.ContainsFunc(listMonitors(), func(m monitor) bool { return m.ID == id }) {
				return fmt.Errorf("%s isn't connected", label)
			}
			return nil
		},
	}
}

// monitorPrefabs is a screenshot for each monitor, when there's more than one
// to choose from
func monitorPrefabs() []Prefab {
	monitors := listMonitors()
	if len(monitors) < 2 {
		return nil
	}
	prefabs := make([]Prefab, 0, len(monitors))
	for _, m := range monitors {
		prefabs = append(prefabs, monitorPrefab(m.ID))
	}
	return prefabs
}

// monitorID is the monitor a screenshot-monitor prefab ID names
func monitorID(prefabID string) (string, bool) {
	id, ok := strings.CutPrefix(prefabID, monitorPrefix)
	return id, ok && id != ""
}
