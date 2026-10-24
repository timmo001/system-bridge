package system

import (
	"context"
	"sync"
	"time"
)

const (
	packageUpdatesInterval = time.Hour
	// packageUpdatesRetry is how soon a failed check runs again, such as when
	// the system was offline
	packageUpdatesRetry   = 10 * time.Minute
	packageUpdatesTimeout = 5 * time.Minute
)

var packageUpdates struct {
	sync.Mutex
	count   *int
	ok      bool
	checked time.Time
	running bool
}

// GetPackageUpdates returns how many package updates are waiting, or nil
// until the first check finishes or where no supported package manager is
// installed. Package managers can take minutes, so the check runs in the
// background about once an hour and this returns the last result.
func GetPackageUpdates() *int {
	packageUpdates.Lock()
	defer packageUpdates.Unlock()

	wait := packageUpdatesInterval
	if !packageUpdates.ok {
		wait = packageUpdatesRetry
	}
	if !packageUpdates.running && (packageUpdates.checked.IsZero() || time.Since(packageUpdates.checked) >= wait) {
		packageUpdates.running = true
		go refreshPackageUpdates()
	}
	return packageUpdates.count
}

func refreshPackageUpdates() {
	ctx, cancel := context.WithTimeout(context.Background(), packageUpdatesTimeout)
	defer cancel()
	count, ok := countPackageUpdates(ctx)

	packageUpdates.Lock()
	defer packageUpdates.Unlock()
	packageUpdates.running = false
	packageUpdates.checked = time.Now()
	packageUpdates.ok = ok
	// A failed check keeps the last count rather than clearing it
	if ok {
		packageUpdates.count = &count
	}
}
