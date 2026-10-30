//go:build darwin

package power

/*
#cgo LDFLAGS: -framework IOKit -framework CoreFoundation

int startSleepNotifications(void);
void runSleepNotifications(double seconds);
void cleanupSleepNotifications(void);
*/
import "C"

import (
	"context"
	"log/slog"
	"runtime"
	"sync"

	"github.com/timmo001/system-bridge/types"
)

// Messages from the C callback in watch_darwin.c
const (
	sleepMessageWillSleep = 1
	sleepMessagePoweredOn = 2
)

var (
	sleepMu      sync.Mutex
	sleepChanged func(types.PowerState)
)

//export goSleepMessage
func goSleepMessage(kind C.int) {
	sleepMu.Lock()
	changed := sleepChanged
	sleepMu.Unlock()
	if changed == nil {
		return
	}
	switch kind {
	case sleepMessageWillSleep:
		notifyBefore(changed, types.PowerStateSleeping)
	case sleepMessagePoweredOn:
		changed(types.PowerStateResumed)
	}
}

// runLoopSlice is how long the run loop runs before checking whether to stop
const runLoopSlice = 1.0

// WatchSleep calls changed before the system sleeps, and after it wakes,
// until ctx is done. macOS waits for the C callback to allow the sleep.
func WatchSleep(ctx context.Context, changed func(types.PowerState)) {
	sleepMu.Lock()
	sleepChanged = changed
	sleepMu.Unlock()
	defer func() {
		sleepMu.Lock()
		sleepChanged = nil
		sleepMu.Unlock()
	}()

	// The notifications arrive on the run loop of the thread that registered
	// for them
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	if C.startSleepNotifications() == 0 {
		slog.Warn("Failed to follow sleep and resume")
		return
	}
	defer C.cleanupSleepNotifications()

	for ctx.Err() == nil {
		C.runSleepNotifications(runLoopSlice)
	}
}
