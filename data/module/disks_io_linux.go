//go:build linux

package data_module

import (
	"os"
	"path/filepath"
	"strings"
)

// countsTowardDiskIOTotal reports whether a block device's I/O counters belong
// in the total. Only whole physical disks count: partitions, device-mapper and
// RAID devices repeat their disks' I/O, and loop and zram devices aren't disks.
// Physical disks are the ones in /sys/block with a backing device.
func countsTowardDiskIOTotal(name string) bool {
	_, err := os.Stat(filepath.Join("/sys/block", name, "device"))
	return err == nil
}

// diskIOCounterName returns the name gopsutil gives a partition device's I/O
// counters, resolving symlinks such as /dev/mapper/root to /dev/dm-0.
func diskIOCounterName(device string) string {
	if resolved, err := filepath.EvalSymlinks(device); err == nil {
		device = resolved
	}
	return strings.TrimPrefix(device, "/dev/")
}
