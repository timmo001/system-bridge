package networks

import (
	"testing"
	"time"

	psnet "github.com/shirou/gopsutil/v4/net"
)

func TestIORateTracker(t *testing.T) {
	var tracker ioRateTracker
	start := time.Unix(1000, 0)
	sample := func(sent, recv uint64) map[string]psnet.IOCountersStat {
		return map[string]psnet.IOCountersStat{"eth0": {BytesSent: sent, BytesRecv: recv}}
	}

	if rates := tracker.update(start, sample(100, 1000)); len(rates) != 0 {
		t.Fatalf("first reading rates = %v, want none", rates)
	}

	rates := tracker.update(start.Add(2*time.Second), sample(300, 5000))
	if r := rates["eth0"]; r.sent == nil || *r.sent != 100 || r.recv == nil || *r.recv != 2000 {
		t.Fatalf("rates = %+v, want sent 100 and recv 2000", r)
	}

	// A reading soon after keeps the previous rates and baseline
	rates = tracker.update(start.Add(2500*time.Millisecond), sample(400, 6000))
	if r := rates["eth0"]; r.sent == nil || *r.sent != 100 {
		t.Fatalf("rates soon after = %+v, want the previous rates", r)
	}

	// Counters going backwards, such as an interface being recreated, give no rate
	rates = tracker.update(start.Add(4*time.Second), sample(50, 7000))
	if r := rates["eth0"]; r.sent != nil || r.recv == nil || *r.recv != 1000 {
		t.Fatalf("rates after reset = %+v, want no sent rate and recv 1000", r)
	}
}
