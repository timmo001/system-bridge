//go:build !linux

package audio

import "context"

// MoveApp isn't supported on this platform, which lists no apps
func MoveApp(context.Context, string, string) error {
	return ErrUnsupported
}
