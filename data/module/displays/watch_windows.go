//go:build windows

package displays

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
)

// watchInterval is how often to compare the monitor layout, which is cheap to
// read, unlike the brightness that DDC/CI and WMI report
const watchInterval = 2 * time.Second

// Watch calls changed whenever a display is connected, removed, moved or
// resized, until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Poll(ctx, watchInterval, func() ([]types.Display, error) {
		found, err := monitors()
		if err != nil {
			return nil, err
		}
		layout := make([]types.Display, 0, len(found))
		for _, m := range found {
			layout = append(layout, m.display)
		}
		return layout, nil
	}, changed)
}
