//go:build linux

package battery

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the events a change makes, such as the charger and
// the battery both reporting a cable being plugged in.
const watchDebounce = 250 * time.Millisecond

// Watch calls changed whenever a battery or power supply reports a change,
// such as the charger being plugged in, until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Uevents(ctx, watchDebounce, []string{"power_supply"}, changed)
}
