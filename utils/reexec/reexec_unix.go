//go:build !windows

package reexec

import (
	"fmt"
	"os"
	"syscall"
)

const supported = true

// Exec replaces the process with the executable at path, with the same
// arguments and environment. The process keeps its ID, so whatever started
// it still owns it. It only returns on failure.
func Exec(path string) error {
	if err := syscall.Exec(path, os.Args, os.Environ()); err != nil {
		return fmt.Errorf("failed to restart into %s: %w", path, err)
	}
	return nil
}
