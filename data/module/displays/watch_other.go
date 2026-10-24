//go:build !linux && !windows

package displays

import "context"

// Watch does nothing on this platform, where displays are read on each
// refresh
func Watch(context.Context, func()) {}
