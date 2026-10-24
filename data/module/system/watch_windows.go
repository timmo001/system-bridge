//go:build windows

package system

import (
	"context"
	"time"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchInterval is how often to check the lock state and the last input,
// which are both cheap to read
const watchInterval = time.Second

// sessionState is what the system module reports straight away when it
// changes
type sessionState struct {
	locked *bool
	away   bool
}

// Watch calls changed whenever the session is locked or unlocked, or the user
// goes away or comes back, until ctx is done.
func Watch(ctx context.Context, changed func()) {
	watch.Poll(ctx, watchInterval, func() (sessionState, error) {
		state := sessionState{locked: sessionLocked()}
		if idle := idleTime(); idle != nil {
			state.away = time.Duration(*idle)*time.Second >= awayAfter
		}
		return state, nil
	}, changed)
}
