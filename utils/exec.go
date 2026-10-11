package utils

import (
	"bytes"
	"os/exec"
)

// RunHidden runs a command with no console window and returns its standard
// output. ok is false when the command could not start or exited with an
// error, which callers treat as the value being unavailable.
func RunHidden(name string, args ...string) (string, bool) {
	cmd := exec.Command(name, args...)
	SetHideWindow(cmd)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", false
	}
	return out.String(), true
}
