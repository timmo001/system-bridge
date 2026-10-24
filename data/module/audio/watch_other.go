//go:build !linux && !windows

package audio

import "context"

// Watch does nothing on this platform, which reports no audio devices yet
func Watch(context.Context, func()) {}
