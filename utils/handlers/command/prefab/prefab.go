// Package prefab holds ready-made commands for common system tasks. Each one
// picks the program to run for the platform when it runs, so an allowlist
// entry naming a prefab works without a full path of its own.
package prefab

import (
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
	// when reports whether the candidate applies to this session. Nil means it
	// always does.
	when func() bool
}

// Prefab is a ready-made command
type Prefab struct {
	ID          string
	Name        string
	Description string
	// candidates are tried in order, keyed by runtime.GOOS
	candidates map[string][]candidate
}

var catalogue = []Prefab{
	{
		ID:          "lock",
		Name:        "Lock screen",
		Description: "Lock the screen",
		candidates: map[string][]candidate{
			"linux":   {{program: "loginctl", arguments: []string{"lock-session"}}},
			"windows": {{program: "rundll32.exe", arguments: []string{"user32.dll,LockWorkStation"}}},
			"darwin":  {{program: "pmset", arguments: []string{"displaysleepnow"}}},
		},
	},
}

var (
	lookPath = exec.LookPath
	goos     = runtime.GOOS
)

// Get returns the prefab with the given ID
func Get(id string) (Prefab, bool) {
	for _, p := range catalogue {
		if p.ID == id {
			return p, true
		}
	}
	return Prefab{}, false
}

// Resolve picks the first candidate that applies here and is installed, and
// returns its full path and arguments
func (p Prefab) Resolve() (string, []string, error) {
	tried := []string{}
	for _, c := range p.candidates[goos] {
		if c.when != nil && !c.when() {
			continue
		}
		tried = append(tried, c.program)
		if path, err := lookPath(c.program); err == nil {
			return path, slices.Clone(c.arguments), nil
		}
	}
	if len(tried) == 0 {
		return "", nil, fmt.Errorf("%s isn't available on this system", p.Name)
	}
	return "", nil, fmt.Errorf("install %s to use %s", strings.Join(tried, " or "), p.Name)
}

// List returns every prefab and how it would run here
func List() []types.CommandPrefab {
	prefabs := make([]types.CommandPrefab, 0, len(catalogue))
	for _, p := range catalogue {
		info := types.CommandPrefab{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Arguments:   []string{},
		}
		command, arguments, err := p.Resolve()
		if err != nil {
			info.Reason = err.Error()
		} else {
			info.Available = true
			info.Command = command
			info.Arguments = append(info.Arguments, arguments...)
		}
		prefabs = append(prefabs, info)
	}
	return prefabs
}
