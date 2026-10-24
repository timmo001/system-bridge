//go:build !linux && !windows

package networks

import "context"

// Watch does nothing on this platform, where networks are read on each
// refresh
func Watch(context.Context, func()) {}
