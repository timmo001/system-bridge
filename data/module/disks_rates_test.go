package data_module

import (
	"testing"
	"time"
)

func TestDiskIORateTracker(t *testing.T) {
	var tracker diskIORateTracker
	start := time.Unix(1000, 0)
	sample := func(read, write uint64) map[string]diskBytes {
		return map[string]diskBytes{"sda": {read: read, write: write}}
	}

	if rates := tracker.update(start, sample(100, 1000)); len(rates) != 0 {
		t.Fatalf("first reading rates = %v, want none", rates)
	}

	rates := tracker.update(start.Add(2*time.Second), sample(300, 5000))
	if r := rates["sda"]; r.read == nil || *r.read != 100 || r.write == nil || *r.write != 2000 {
		t.Fatalf("rates = %+v, want read 100 and write 2000", r)
	}

	// A reading soon after keeps the previous rates and baseline
	rates = tracker.update(start.Add(2500*time.Millisecond), sample(400, 6000))
	if r := rates["sda"]; r.read == nil || *r.read != 100 {
		t.Fatalf("rates soon after = %+v, want the previous rates", r)
	}

	// Counters going backwards, such as a disk being re-added, give no rate
	rates = tracker.update(start.Add(4*time.Second), sample(50, 7000))
	if r := rates["sda"]; r.read != nil || r.write == nil || *r.write != 1000 {
		t.Fatalf("rates after reset = %+v, want no read rate and write 1000", r)
	}
}
