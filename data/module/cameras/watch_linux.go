//go:build linux

package cameras

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce lets udev create a camera's device nodes and links before
// they're read.
const watchDebounce = time.Second

// Watch calls changed whenever a camera is connected or removed, until ctx
// is done.
func Watch(ctx context.Context, changed func()) {
	watch.Uevents(ctx, watchDebounce, []string{"video4linux"}, changed)
}
