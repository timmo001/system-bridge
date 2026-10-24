//go:build !linux && !windows

package bluetooth

import (
	"context"
	"fmt"
)

// Connect isn't supported on this platform yet
func Connect(context.Context, string) error {
	return fmt.Errorf("%w: connecting a device", ErrUnsupported)
}

// Disconnect isn't supported on this platform yet
func Disconnect(context.Context, string) error {
	return fmt.Errorf("%w: disconnecting a device", ErrUnsupported)
}

// Forget isn't supported on this platform yet
func Forget(context.Context, string) error {
	return fmt.Errorf("%w: forgetting a device", ErrUnsupported)
}

// SetPowered isn't supported on this platform yet
func SetPowered(context.Context, bool) error {
	return fmt.Errorf("%w: turning the adapter on or off", ErrUnsupported)
}
