//go:build windows

package audio

import (
	"context"
	"reflect"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// watchInterval is how often to check for changes. Core Audio's volume
// callbacks aren't available through go-wca, so this compares readings, which
// are COM calls rather than new processes.
const watchInterval = time.Second

// Watch calls changed whenever an output, an input or the defaults change,
// until ctx is done.
func Watch(ctx context.Context, changed func()) {
	ticker := time.NewTicker(watchInterval)
	defer ticker.Stop()

	var last types.AudioData
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		data, err := GetAudioData(ctx)
		if err != nil {
			continue
		}
		if last.Outputs != nil && !reflect.DeepEqual(data, last) {
			changed()
		}
		last = data
	}
}
