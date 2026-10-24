//go:build !linux && !windows

package battery

import "context"

// Watch does nothing on this platform, where the battery is read on each
// refresh
func Watch(context.Context, func()) {}
