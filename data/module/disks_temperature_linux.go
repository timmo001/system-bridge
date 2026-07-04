//go:build linux

package data_module

import (
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// readDiskTemperatures returns a map of physical block device name (e.g.
// "nvme0n1", "sda") to temperature in degrees Celsius, read from Linux hwmon
// interfaces. This covers the nvme driver (Composite sensor) and the drivetemp
// driver (SATA/SCSI drives). Returns an empty map when no disk temperature
// sensors are present.
func readDiskTemperatures() map[string]float64 {
	temps := make(map[string]float64)

	hwmonDirs, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil {
		return temps
	}

	// Pre-resolve the real sysfs path of every whole-disk block device so we can
	// match it against each hwmon's backing device subtree.
	blockDevs, err := filepath.Glob("/sys/block/*")
	if err != nil {
		return temps
	}
	type blockEntry struct {
		name string
		real string
	}
	blocks := make([]blockEntry, 0, len(blockDevs))
	for _, b := range blockDevs {
		name := filepath.Base(b)
		if strings.HasPrefix(name, "loop") || strings.HasPrefix(name, "ram") || strings.HasPrefix(name, "zram") {
			continue
		}
		real, err := filepath.EvalSymlinks(b)
		if err != nil {
			continue
		}
		blocks = append(blocks, blockEntry{name: name, real: real})
	}

	for _, dir := range hwmonDirs {
		devReal, err := filepath.EvalSymlinks(filepath.Join(dir, "device"))
		if err != nil {
			continue
		}

		temp := readDiskHwmonTemp(dir)
		if temp == nil {
			continue
		}

		// A hwmon belongs to a disk when a block device lives within the hwmon's
		// backing device subtree (nvme controller or SATA/SCSI device).
		for _, blk := range blocks {
			if blk.real == devReal || strings.HasPrefix(blk.real, devReal+"/") {
				temps[blk.name] = *temp
			}
		}
	}

	return temps
}

// readDiskHwmonTemp reads the drive temperature from a hwmon directory,
// preferring a "Composite" labelled sensor (NVMe) and falling back to
// temp1_input. Values are converted from milli-degrees to degrees Celsius.
func readDiskHwmonTemp(hwmonDir string) *float64 {
	labels, _ := filepath.Glob(filepath.Join(hwmonDir, "temp*_label"))
	sort.Strings(labels)
	for _, labelPath := range labels {
		label, ok := readDiskSysString(labelPath)
		if !ok {
			continue
		}
		if strings.EqualFold(label, "Composite") {
			inputPath := strings.TrimSuffix(labelPath, "_label") + "_input"
			if v := readDiskSysFloat(inputPath); v != nil {
				c := *v / 1000.0
				return &c
			}
		}
	}
	if v := readDiskSysFloat(filepath.Join(hwmonDir, "temp1_input")); v != nil {
		c := *v / 1000.0
		return &c
	}
	return nil
}

// resolvePhysicalDevice maps a device path or name (e.g. "/dev/dm-0",
// "/dev/nvme0n1p2", "sda1") to its underlying physical whole-disk device name
// (e.g. "nvme0n1", "sda"). Device-mapper targets are resolved through their
// slaves, and partitions are resolved to their parent disk.
func resolvePhysicalDevice(device string) string {
	name := strings.TrimPrefix(device, "/dev/")

	// Bound the loop to avoid cycles in pathological device-mapper stacks.
	for i := 0; i < 8; i++ {
		sysPath := filepath.Join("/sys/class/block", name)
		if _, err := os.Stat(sysPath); err != nil {
			return name
		}

		// Device-mapper (LUKS/LVM): follow the first slave device.
		if strings.HasPrefix(name, "dm-") {
			slaves, err := filepath.Glob(filepath.Join("/sys/block", name, "slaves", "*"))
			if err != nil || len(slaves) == 0 {
				return name
			}
			sort.Strings(slaves)
			name = filepath.Base(slaves[0])
			continue
		}

		// Partition: resolve to the parent whole-disk device.
		if _, err := os.Stat(filepath.Join(sysPath, "partition")); err == nil {
			real, err := filepath.EvalSymlinks(sysPath)
			if err != nil {
				return name
			}
			parent := filepath.Base(filepath.Dir(real))
			if parent == "" || parent == name {
				return name
			}
			name = parent
			continue
		}

		return name
	}

	return name
}

func readDiskSysString(path string) (string, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", false
	}
	return strings.TrimSpace(string(data)), true
}

func readDiskSysFloat(path string) *float64 {
	s, ok := readDiskSysString(path)
	if !ok {
		return nil
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &v
}
