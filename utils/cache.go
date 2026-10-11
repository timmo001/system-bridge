package utils

import (
	"sync"
	"time"
)

// TTLValue caches a single value for a fixed time. It is for data that is
// expensive to gather and rarely changes, such as hardware names read by
// shelling out to a system tool. A failed load is remembered for FailTTL so
// a tool that is missing or keeps failing is not retried on every update.
type TTLValue[T any] struct {
	// TTL is how long a successful load stays fresh.
	TTL time.Duration
	// FailTTL is how long a failed load is remembered before retrying. When
	// zero, failures are not cached.
	FailTTL time.Duration

	mu    sync.Mutex
	value T
	ok    bool
	at    time.Time
}

// Get returns the cached value when it is still fresh, otherwise it calls
// load and caches the result. ok reports whether the value came from a
// successful load.
func (c *TTLValue[T]) Get(load func() (T, bool)) (T, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if !c.at.IsZero() {
		ttl := c.TTL
		if !c.ok {
			ttl = c.FailTTL
		}
		if ttl > 0 && time.Since(c.at) < ttl {
			return c.value, c.ok
		}
	}

	value, ok := load()
	c.value = value
	c.ok = ok
	c.at = time.Now()
	return value, ok
}

// Reset drops the cached value so the next Get loads again.
func (c *TTLValue[T]) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	var zero T
	c.value = zero
	c.ok = false
	c.at = time.Time{}
}
