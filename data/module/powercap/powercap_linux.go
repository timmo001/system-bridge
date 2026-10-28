//go:build linux

package powercap

import (
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const root = "/sys/class/powercap"

type reading struct {
	energyUJ float64
	at       time.Time
}

var (
	mu   sync.Mutex
	last = make(map[string]reading)
)

// ZonePath returns the first intel-rapl zone with the given name, such as
// "psys" (the whole platform) or "uncore" (the integrated GPU), or an empty
// string when there is none.
func ZonePath(name string) string {
	return zonePath(root, name)
}

func zonePath(root, name string) string {
	zones, err := filepath.Glob(filepath.Join(root, "intel-rapl:*"))
	if err != nil {
		return ""
	}
	sort.Strings(zones)
	for _, zone := range zones {
		if readString(filepath.Join(zone, "name")) == name {
			return zone
		}
	}
	return ""
}

// Watts returns the average power of a zone since the previous call for the
// same zone. The first call only records the counter, so it returns nil.
func Watts(zone string) *float64 {
	return watts(zone, time.Now())
}

func watts(zone string, now time.Time) *float64 {
	if zone == "" {
		return nil
	}
	energy, err := strconv.ParseFloat(readString(filepath.Join(zone, "energy_uj")), 64)
	if err != nil {
		return nil
	}

	mu.Lock()
	prev, seen := last[zone]
	last[zone] = reading{energyUJ: energy, at: now}
	mu.Unlock()

	if !seen {
		return nil
	}
	seconds := now.Sub(prev.at).Seconds()
	if seconds <= 0 {
		return nil
	}
	delta := energy - prev.energyUJ
	if delta < 0 {
		// The counter wrapped
		maxRange, err := strconv.ParseFloat(readString(filepath.Join(zone, "max_energy_range_uj")), 64)
		if err != nil {
			return nil
		}
		delta += maxRange
	}
	w := delta / 1_000_000 / seconds
	return &w
}

func readString(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(data))
}
