//go:build !linux

package prefab

import (
	"context"
	"errors"
)

// SetClipboard isn't supported on this platform yet
func SetClipboard(context.Context, string) error {
	return errors.New("setting the clipboard is only supported on Linux")
}
