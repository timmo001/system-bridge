package data_module

import (
	"sync"
	"time"
)

// diskTotalKey holds the counters summed across every disk. Counter names are
// never empty, so it can't clash with one.
const diskTotalKey = ""

// minDiskRateInterval keeps readings taken close together, such as a data
// request just after a scheduled update, from giving noisy rates. Those
// readings reuse the previous rates.
const minDiskRateInterval = time.Second

type diskBytes struct {
	read  uint64
	write uint64
}

type diskRates struct {
	read  *float64
	write *float64
}

// diskIORateTracker works out read and write rates from the change in
// counters since the previous reading.
type diskIORateTracker struct {
	mu       sync.Mutex
	time     time.Time
	counters map[string]diskBytes
	rates    map[string]diskRates
}

var diskRateTracker diskIORateTracker

// update stores counters as the new baseline and returns the rates since the
// previous one, by counter name. The returned map must not be changed.
func (t *diskIORateTracker) update(now time.Time, counters map[string]diskBytes) map[string]diskRates {
	t.mu.Lock()
	defer t.mu.Unlock()

	elapsed := now.Sub(t.time)
	if t.counters != nil && elapsed < minDiskRateInterval {
		return t.rates
	}

	rates := make(map[string]diskRates, len(counters))
	if t.counters != nil {
		seconds := elapsed.Seconds()
		for name, current := range counters {
			if previous, ok := t.counters[name]; ok {
				rates[name] = diskRates{
					read:  diskByteRate(previous.read, current.read, seconds),
					write: diskByteRate(previous.write, current.write, seconds),
				}
			}
		}
	}
	t.time, t.counters, t.rates = now, counters, rates
	return rates
}

func diskByteRate(previous, current uint64, seconds float64) *float64 {
	// Counters reset when a disk is removed and added again, and the total
	// drops when one goes away
	if current < previous {
		return nil
	}
	rate := float64(current-previous) / seconds
	return &rate
}
