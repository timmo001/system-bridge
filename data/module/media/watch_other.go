//go:build !linux

package media

import "context"

// Watch does nothing on this platform, where media is read on each refresh
func Watch(context.Context, func()) {}
