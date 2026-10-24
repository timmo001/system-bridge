//go:build windows

package networks

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/sys/windows"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the interface and address notifications that
// connecting to a network makes into a single update.
const watchDebounce = 500 * time.Millisecond

var (
	notifyMu      sync.Mutex
	notifyTrigger func()
	// notifyCallback is created once, because windows.NewCallback never frees
	// a callback and Windows allows only a limited number per process.
	notifyCallback = windows.NewCallback(func(_ uintptr, _ uintptr, _ uint32) uintptr {
		notifyMu.Lock()
		trigger := notifyTrigger
		notifyMu.Unlock()
		if trigger != nil {
			trigger()
		}
		return 0
	})
)

// Watch calls changed whenever an interface comes up or goes down, or gains
// or loses an address, until ctx is done. Joining or leaving a Wi-Fi network
// changes the interface, so it's reported too.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	notifyMu.Lock()
	notifyTrigger = trigger
	notifyMu.Unlock()
	defer func() {
		notifyMu.Lock()
		notifyTrigger = nil
		notifyMu.Unlock()
	}()

	var interfaces, addresses windows.Handle
	if err := windows.NotifyIpInterfaceChange(windows.AF_UNSPEC, notifyCallback, nil, false, &interfaces); err != nil {
		slog.Debug("Network interface notifications unavailable", "error", err)
		return
	}
	defer func() { _ = windows.CancelMibChangeNotify2(interfaces) }()
	if err := windows.NotifyUnicastIpAddressChange(windows.AF_UNSPEC, notifyCallback, nil, false, &addresses); err != nil {
		slog.Debug("Network address notifications unavailable", "error", err)
		return
	}
	defer func() { _ = windows.CancelMibChangeNotify2(addresses) }()

	<-ctx.Done()
}
