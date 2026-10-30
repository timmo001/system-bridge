//go:build windows

package power

import (
	"context"
	"log/slog"
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"

	"github.com/timmo001/system-bridge/types"
)

const (
	// deviceNotifyCallback has Windows call a function rather than post to a
	// window
	deviceNotifyCallback  = 2
	pbtAPMSuspend         = 0x4
	pbtAPMResumeAutomatic = 0x12
)

// deviceNotifySubscribeParameters is DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS
type deviceNotifySubscribeParameters struct {
	callback uintptr
	context  uintptr
}

var (
	modUser32                               = windows.NewLazySystemDLL("user32.dll")
	procRegisterSuspendResumeNotification   = modUser32.NewProc("RegisterSuspendResumeNotification")
	procUnregisterSuspendResumeNotification = modUser32.NewProc("UnregisterSuspendResumeNotification")

	sleepMu      sync.Mutex
	sleepChanged func(types.PowerState)
	// sleepParameters is created once, because windows.NewCallback never
	// frees a callback, and Windows keeps a pointer to it while registered
	sleepParameters = &deviceNotifySubscribeParameters{
		callback: windows.NewCallback(func(_ uintptr, kind uintptr, _ uintptr) uintptr {
			sleepMu.Lock()
			changed := sleepChanged
			sleepMu.Unlock()
			if changed == nil {
				return 0
			}
			switch kind {
			case pbtAPMSuspend:
				notifyBefore(changed, types.PowerStateSleeping)
			case pbtAPMResumeAutomatic:
				// Always sent on waking, unlike PBT_APMRESUMESUSPEND, which
				// needs someone at the machine
				changed(types.PowerStateResumed)
			}
			return 0
		}),
	}
)

// WatchSleep calls changed before the system sleeps, and after it wakes,
// until ctx is done. Windows waits about 2 seconds after telling us.
func WatchSleep(ctx context.Context, changed func(types.PowerState)) {
	sleepMu.Lock()
	sleepChanged = changed
	sleepMu.Unlock()
	defer func() {
		sleepMu.Lock()
		sleepChanged = nil
		sleepMu.Unlock()
	}()

	handle, _, err := procRegisterSuspendResumeNotification.Call(uintptr(unsafe.Pointer(sleepParameters)), deviceNotifyCallback)
	if handle == 0 {
		slog.Warn("Failed to follow sleep and resume", "error", err)
		return
	}
	defer func() {
		if ret, _, err := procUnregisterSuspendResumeNotification.Call(handle); ret == 0 {
			slog.Debug("Failed to stop following sleep and resume", "error", err)
		}
	}()

	<-ctx.Done()
}
