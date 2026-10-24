//go:build !linux && !windows

package audio

import "context"

// SetVolume isn't supported on this platform yet
func SetVolume(context.Context, string, float64) error {
	return ErrUnsupported
}

// SetMuted isn't supported on this platform yet
func SetMuted(context.Context, string, bool) error {
	return ErrUnsupported
}

// SetDefault isn't supported on this platform yet
func SetDefault(context.Context, string) error {
	return ErrUnsupported
}
