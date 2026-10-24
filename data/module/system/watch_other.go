//go:build !linux && !windows

package system

import "context"

// Watch does nothing on this platform, where the lock and idle state are read
// on each refresh
func Watch(context.Context, func()) {}
