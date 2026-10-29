package networks

import (
	"log/slog"
	"math"
	"slices"
	"sync"
	"time"

	psnet "github.com/shirou/gopsutil/v4/net"
	"github.com/timmo001/system-bridge/types"
)

// totalKey holds the counters summed across every interface. Interface names
// are never empty, so it can't clash with one.
const totalKey = ""

// minRateInterval keeps readings taken close together, such as a data request
// just after a scheduled update, from giving noisy rates. Those readings reuse
// the previous rates.
const minRateInterval = time.Second

type ioRates struct {
	sent *float64
	recv *float64
}

// ioRateTracker works out transfer rates from the change in counters since
// the previous reading.
type ioRateTracker struct {
	mu       sync.Mutex
	time     time.Time
	counters map[string]psnet.IOCountersStat
	rates    map[string]ioRates
}

var rateTracker ioRateTracker

// update stores counters as the new baseline and returns the rates since the
// previous one, by interface name. The returned map must not be changed.
func (t *ioRateTracker) update(now time.Time, counters map[string]psnet.IOCountersStat) map[string]ioRates {
	t.mu.Lock()
	defer t.mu.Unlock()

	elapsed := now.Sub(t.time)
	if t.counters != nil && elapsed < minRateInterval {
		return t.rates
	}

	rates := make(map[string]ioRates, len(counters))
	if t.counters != nil {
		seconds := elapsed.Seconds()
		for name, current := range counters {
			if previous, ok := t.counters[name]; ok {
				rates[name] = ioRates{
					sent: byteRate(previous.BytesSent, current.BytesSent, seconds),
					recv: byteRate(previous.BytesRecv, current.BytesRecv, seconds),
				}
			}
		}
	}
	t.time, t.counters, t.rates = now, counters, rates
	return rates
}

func byteRate(previous, current uint64, seconds float64) *float64 {
	// Counters reset when an interface is recreated, and the total drops when
	// one goes away
	if current < previous {
		return nil
	}
	rate := math.Round(float64(current-previous) / seconds)
	return &rate
}

// GatherIOStatistics collects network I/O statistics for all interfaces
// combined, leaving out loopback, and for each interface in
// networksData.Networks, so it must run after GatherInterfaces.
func GatherIOStatistics(networksData *types.NetworksData) {
	perInterface, err := psnet.IOCounters(true)
	if err != nil {
		slog.Warn("Error getting network I/O counters", "error", err)
		networksData.IO = toNetworkIO(psnet.IOCountersStat{}, ioRates{})
		return
	}

	loopback := loopbackInterfaces(networksData.Networks)
	counters := make(map[string]psnet.IOCountersStat, len(perInterface)+1)
	var total psnet.IOCountersStat
	for _, c := range perInterface {
		counters[c.Name] = c
		// Local traffic never leaves the machine, and counting it would
		// swamp the total
		if loopback[c.Name] {
			continue
		}
		total.BytesSent += c.BytesSent
		total.BytesRecv += c.BytesRecv
		total.PacketsSent += c.PacketsSent
		total.PacketsRecv += c.PacketsRecv
		total.Errin += c.Errin
		total.Errout += c.Errout
		total.Dropin += c.Dropin
		total.Dropout += c.Dropout
	}
	counters[totalKey] = total

	rates := rateTracker.update(time.Now(), counters)

	networksData.IO = toNetworkIO(total, rates[totalKey])
	for i := range networksData.Networks {
		network := &networksData.Networks[i]
		if network.Name == nil {
			continue
		}
		if c, ok := counters[*network.Name]; ok {
			network.IO = toNetworkIO(c, rates[*network.Name])
		}
	}
}

func loopbackInterfaces(networks []types.Network) map[string]bool {
	loopback := make(map[string]bool)
	for _, network := range networks {
		if network.Name == nil || network.Stats == nil {
			continue
		}
		if slices.Contains(network.Stats.Flags, "loopback") {
			loopback[*network.Name] = true
		}
	}
	return loopback
}

func toNetworkIO(c psnet.IOCountersStat, rates ioRates) *types.NetworkIO {
	bytesSent := int64(c.BytesSent)
	bytesRecv := int64(c.BytesRecv)
	packetsSent := int64(c.PacketsSent)
	packetsRecv := int64(c.PacketsRecv)
	errIn := int64(c.Errin)
	errOut := int64(c.Errout)
	dropIn := int64(c.Dropin)
	dropOut := int64(c.Dropout)

	return &types.NetworkIO{
		BytesSent:     &bytesSent,
		BytesRecv:     &bytesRecv,
		PacketsSent:   &packetsSent,
		PacketsRecv:   &packetsRecv,
		ErrIn:         &errIn,
		ErrOut:        &errOut,
		DropIn:        &dropIn,
		DropOut:       &dropOut,
		BytesSentRate: rates.sent,
		BytesRecvRate: rates.recv,
	}
}
