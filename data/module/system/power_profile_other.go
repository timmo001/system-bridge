//go:build !linux

package system

import (
	"context"
	"errors"
)

// GetPowerProfile returns no profile, since power profiles are only read from
// power-profiles-daemon on Linux
func GetPowerProfile(context.Context) (*string, []string) {
	return nil, []string{}
}

// SetPowerProfile isn't supported on this platform
func SetPowerProfile(context.Context, string) error {
	return errors.New("power profiles are only supported on Linux")
}
