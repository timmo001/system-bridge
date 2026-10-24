//go:build windows

package bluetooth

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
)

// watchInterval is how often to compare the paired devices, which Windows
// reads from what it remembers rather than a new search
const watchInterval = 2 * time.Second

// Watch calls changed whenever a device is paired, removed, connected,
// disconnected or renamed, until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Poll(ctx, watchInterval, func() (types.BluetoothData, error) {
		return GetBluetoothData(ctx)
	}, changed)
}
