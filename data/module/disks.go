package data_module

import (
	"context"
	"strings"

	"github.com/charmbracelet/log"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/timmo001/system-bridge/types"
)

// DiskIOCounters represents disk I/O statistics
type DiskIOCounters struct {
	ReadCount  uint64 `json:"read_count"`
	WriteCount uint64 `json:"write_count"`
	ReadBytes  uint64 `json:"read_bytes"`
	WriteBytes uint64 `json:"write_bytes"`
	ReadTime   uint64 `json:"read_time"`
	WriteTime  uint64 `json:"write_time"`
}

// DiskUsage represents disk space usage information
type DiskUsage struct {
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
	Percent float64 `json:"percent"`
}

// DiskPartition represents information about a disk partition
type DiskPartition struct {
	Device         string     `json:"device"`
	MountPoint     string     `json:"mount_point"`
	FilesystemType string     `json:"filesystem_type"`
	Options        string     `json:"options"`
	MaxFileSize    int64      `json:"max_file_size"`
	MaxPathLength  int64      `json:"max_path_length"`
	Usage          *DiskUsage `json:"usage"`
}

// Disk represents information about a single disk device
type Disk struct {
	Name       string          `json:"name"`
	Partitions []DiskPartition `json:"partitions"`
	IOCounters *DiskIOCounters `json:"io_counters"`
}

// DisksData represents information about all disk devices
type DisksData struct {
	Devices    []Disk          `json:"devices"`
	IOCounters *DiskIOCounters `json:"io_counters"`
}

func (disksData DisksData) Name() types.ModuleName { return types.ModuleDisks }
func (disksData DisksData) Update(ctx context.Context) (any, error) {
	log.Info("Getting disks data")

	// Initialize arrays
	disksData.Devices = make([]Disk, 0)

	// Get all partitions
	partitions, err := disk.Partitions(false)
	if err != nil {
		log.Errorf("Failed to get disk partitions: %v", err)
		return disksData, err
	}

	// Get IO counters for all devices
	ioCounters, err := disk.IOCounters()
	if err != nil {
		log.Errorf("Failed to get disk IO counters: %v", err)
		// Continue without IO counters
	} else {
		// Set total IO counters
		var totalIO DiskIOCounters
		for _, counter := range ioCounters {
			totalIO.ReadCount += counter.ReadCount
			totalIO.WriteCount += counter.WriteCount
			totalIO.ReadBytes += counter.ReadBytes
			totalIO.WriteBytes += counter.WriteBytes
			totalIO.ReadTime += counter.ReadTime
			totalIO.WriteTime += counter.WriteTime
		}
		disksData.IOCounters = &totalIO
	}

	// Group partitions by device name
	deviceMap := make(map[string]*Disk)
	for _, partition := range partitions {
		deviceName := partition.Device

		// Get or create device
		device, exists := deviceMap[deviceName]
		if !exists {
			device = &Disk{
				Name:       deviceName,
				Partitions: make([]DiskPartition, 0),
			}
			deviceMap[deviceName] = device
		}

		// Get usage statistics
		usage, err := disk.Usage(partition.Mountpoint)
		var diskUsage *DiskUsage
		if err != nil {
			log.Errorf("Failed to get disk usage for %s: %v", partition.Mountpoint, err)
		} else {
			diskUsage = &DiskUsage{
				Total:   usage.Total,
				Used:    usage.Used,
				Free:    usage.Free,
				Percent: usage.UsedPercent,
			}
		}

		// Create partition info
		diskPartition := DiskPartition{
			Device:         partition.Device,
			MountPoint:     partition.Mountpoint,
			FilesystemType: partition.Fstype,
			Options:        strings.Join(partition.Opts, ","),
			Usage:          diskUsage,
		}

		// Add partition to device
		device.Partitions = append(device.Partitions, diskPartition)

		// Add IO counters for the device if available
		if counter, ok := ioCounters[deviceName]; ok {
			device.IOCounters = &DiskIOCounters{
				ReadCount:  counter.ReadCount,
				WriteCount: counter.WriteCount,
				ReadBytes:  counter.ReadBytes,
				WriteBytes: counter.WriteBytes,
				ReadTime:   counter.ReadTime,
				WriteTime:  counter.WriteTime,
			}
		}
	}

	// Convert map to array
	for _, device := range deviceMap {
		disksData.Devices = append(disksData.Devices, *device)
	}

	return disksData, nil
}
