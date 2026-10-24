//go:build !linux

package data_module

import "strings"

// countsTowardDiskIOTotal reports whether a device's I/O counters belong in
// the total. gopsutil only reports whole disks on macOS and volumes on
// Windows, so every device counts.
func countsTowardDiskIOTotal(string) bool {
	return true
}

// diskIOCounterName returns the name gopsutil gives a partition device's I/O
// counters.
func diskIOCounterName(device string) string {
	return strings.TrimPrefix(device, "/dev/")
}
