package power

import (
	"log/slog"
	"time"

	"github.com/timmo001/system-bridge/types"
)

// noticeTimeout is how long to wait for clients to be told before letting the
// system sleep or shut down anyway. Each system only waits a few seconds, and
// a client that stopped reading mustn't keep it awake.
const noticeTimeout = time.Second

// notifyBefore calls changed, waiting at most noticeTimeout for it
func notifyBefore(changed func(types.PowerState), state types.PowerState) {
	done := make(chan struct{})
	go func() {
		changed(state)
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(noticeTimeout):
		slog.Debug("Clients weren't told about the power state in time", "state", state)
	}
}
