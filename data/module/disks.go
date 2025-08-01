package data_module

import (
	"context"
	"strings"

	"log/slog"

	"github.com/shirou/gopsutil/v4/disk"
	"github.com/timmo001/system-bridge/types"
)

type DiskModule struct{}

func (diskModule DiskModule) Name() types.ModuleName { return types.ModuleDisks }
func (diskModule DiskModule) Update(ctx context.Context) (any, error) {
	slog.Info("Getting disks data")

	var disksData types.DisksData
	// Initialize arrays
	disksData.Devices = make([]types.Disk, 0)

	// Get all partitions
	partitions, err := disk.Partitions(false)
	if err != nil {
		slog.Error("Failed to get disk partitions", "error", err)
		return disksData, err
	}

	// Get IO counters for all devices
	ioCounters, err := disk.IOCounters()
	if err != nil {
		slog.Error("Failed to get disk IO counters", "error", err)
		// Continue without IO counters
	} else {
		// Set total IO counters
		var totalIO types.DiskIOCounters
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
	deviceMap := make(map[string]*types.Disk)
	for _, partition := range partitions {
		deviceName := partition.Device

		// Get or create device
		device, exists := deviceMap[deviceName]
		if !exists {
			device = &types.Disk{
				Name:       deviceName,
				Partitions: make([]types.DiskPartition, 0),
			}
			deviceMap[deviceName] = device
		}

		// Get usage statistics
		usage, err := disk.Usage(partition.Mountpoint)
		var diskUsage *types.DiskUsage
		if err != nil {
			slog.Error("Failed to get disk usage:", "mountpoint", partition.Mountpoint, "error", err)
		} else {
			diskUsage = &types.DiskUsage{
				Total:   usage.Total,
				Used:    usage.Used,
				Free:    usage.Free,
				Percent: usage.UsedPercent,
			}
		}

		// Create partition info
		diskPartition := types.DiskPartition{
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
			device.IOCounters = &types.DiskIOCounters{
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
