//go:build !linux

package system

import (
	"context"
	"errors"
	"time"
)

// GetKeepAwake reports nothing, since keeping awake is only supported on Linux
func GetKeepAwake(context.Context) (*bool, *int64) {
	return nil, nil
}

// SetKeepAwake isn't supported on this platform
func SetKeepAwake(context.Context, bool, time.Duration) error {
	return errors.New("keeping the system awake is only supported on Linux")
}
