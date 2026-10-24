//go:build linux

package displays

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce gives the compositor time to set up a display that was just
// connected before it's read.
const watchDebounce = time.Second

// Watch calls changed whenever a display is connected or removed, or a
// panel's backlight changes, until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Uevents(ctx, watchDebounce, []string{"backlight", "drm"}, changed)
}
