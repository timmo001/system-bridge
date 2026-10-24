//go:build windows

package audio

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/watch"
)

// watchInterval is how often to check for changes. Core Audio's volume
// callbacks aren't available through go-wca, so this compares readings, which
// are COM calls rather than new processes.
const watchInterval = time.Second

// Watch calls changed whenever an output, an input or the defaults change,
// until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Poll(ctx, watchInterval, func() (types.AudioData, error) {
		return GetAudioData(ctx)
	}, changed)
}
