//go:build !linux && !windows

package prefab

// Monitors can't be listed here, so there's no screenshot of each
func listMonitors() []monitor { return nil }

func monitorLabel(id string) string { return id }

func monitorBuiltin(string) Builtin { return nil }
