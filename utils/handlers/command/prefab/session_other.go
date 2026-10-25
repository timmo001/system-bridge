//go:build !linux

package prefab

import "os"

// Desktop candidates only apply on Linux
func onHyprland() bool { return false }
func onKDE() bool      { return false }
func onGNOME() bool    { return false }
func onWlroots() bool  { return false }
func onX11() bool      { return false }

// sessionEnv is the environment for a program a prefab runs
func sessionEnv() []string { return os.Environ() }
