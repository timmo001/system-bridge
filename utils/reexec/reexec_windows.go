//go:build windows

package reexec

import "errors"

// Windows locks a running executable, so the installer replaces it only after
// stopping System Bridge.
const supported = false

func Exec(path string) error {
	return errors.New("restarting in place is not supported on Windows")
}
