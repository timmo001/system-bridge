package data_module

import (
	"context"
	"slices"
	"sort"
	"strings"

	"log/slog"

	"github.com/shirou/gopsutil/v4/disk"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

type DiskModule struct{}

// partitionsFunc is the function used to retrieve partitions. Override in tests.
var partitionsFunc = disk.Partitions

// usageFunc is the function used to retrieve disk usage. Override in tests.
var usageFunc = disk.Usage

func (diskModule DiskModule) Name() types.ModuleName { return types.ModuleDisks }
func (diskModule DiskModule) Update(ctx context.Context) (any, error) {
	slog.Debug("Getting disks data")

	cfg, err := settings.Load()
	if err != nil {
		slog.Warn("Failed to load settings for disk filtering, using defaults", "error", err)
		cfg = &settings.Settings{}
	}

	var disksData types.DisksData
	disksData.Devices = make([]types.Disk, 0)

	// Get all partitions (true includes device-mapper, LUKS, LVM, btrfs subvolumes)
	allPartitions, err := partitionsFunc(true)
	if err != nil {
		slog.Error("Failed to get disk partitions", "error", err)
		return disksData, err
	}

	// Filter to relevant partitions based on settings
	allowedSet := make(map[string]bool, len(cfg.Disks.AllowedSecondaryMountPoints))
	for _, mp := range cfg.Disks.AllowedSecondaryMountPoints {
		allowedSet[mp] = true
	}

	var partitions []disk.PartitionStat
	for _, p := range allPartitions {
		if !strings.HasPrefix(p.Device, "/dev/") {
			continue
		}
		category := ClassifyMount(p)
		if category != types.DiskMountCategoryPrimary && !allowedSet[p.Mountpoint] {
			continue
		}
		partitions = append(partitions, p)
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
		usage, err := usageFunc(partition.Mountpoint)
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
			Category:       ClassifyMount(partition),
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
		// Sort partitions within each device by mount point for stable ordering
		sort.Slice(device.Partitions, func(i, j int) bool {
			return device.Partitions[i].MountPoint < device.Partitions[j].MountPoint
		})
		disksData.Devices = append(disksData.Devices, *device)
	}

	// Sort devices by name for deterministic ordering across API calls
	sort.Slice(disksData.Devices, func(i, j int) bool {
		return disksData.Devices[i].Name < disksData.Devices[j].Name
	})

	return disksData, nil
}

// ClassifyMount determines the category of a partition based on its properties.
func ClassifyMount(p disk.PartitionStat) types.DiskMountCategory {
	// Root mount is always primary regardless of options
	if p.Mountpoint == "/" {
		return types.DiskMountCategoryPrimary
	}
	if p.Fstype == "squashfs" {
		return types.DiskMountCategorySquashFS
	}
	if slices.Contains(p.Opts, "bind") {
		return types.DiskMountCategoryBind
	}
	return types.DiskMountCategoryPrimary
}

// GetAllMountsCategorized returns all /dev/ mounts categorized for the settings UI.
func GetAllMountsCategorized() (*types.DiskMountsResponse, error) {
	allPartitions, err := partitionsFunc(true)
	if err != nil {
		return nil, err
	}

	response := &types.DiskMountsResponse{
		Primary: make([]types.DiskMountInfo, 0),
		Secondary: types.DiskMountsSecondary{
			Bind:     make([]types.DiskMountInfo, 0),
			SquashFS: make([]types.DiskMountInfo, 0),
		},
	}

	for _, p := range allPartitions {
		if !strings.HasPrefix(p.Device, "/dev/") {
			continue
		}

		category := ClassifyMount(p)

		// Get usage stats
		var diskUsage *types.DiskUsage
		usage, err := usageFunc(p.Mountpoint)
		if err == nil {
			diskUsage = &types.DiskUsage{
				Total:   usage.Total,
				Used:    usage.Used,
				Free:    usage.Free,
				Percent: usage.UsedPercent,
			}
		}

		info := types.DiskMountInfo{
			Device:         p.Device,
			MountPoint:     p.Mountpoint,
			FilesystemType: p.Fstype,
			Category:       category,
			Usage:          diskUsage,
		}

		switch category {
		case types.DiskMountCategoryPrimary:
			response.Primary = append(response.Primary, info)
		case types.DiskMountCategoryBind:
			response.Secondary.Bind = append(response.Secondary.Bind, info)
		case types.DiskMountCategorySquashFS:
			response.Secondary.SquashFS = append(response.Secondary.SquashFS, info)
		}
	}

	// Sort each category by mount point for stable ordering
	sort.Slice(response.Primary, func(i, j int) bool {
		return response.Primary[i].MountPoint < response.Primary[j].MountPoint
	})
	sort.Slice(response.Secondary.Bind, func(i, j int) bool {
		return response.Secondary.Bind[i].MountPoint < response.Secondary.Bind[j].MountPoint
	})
	sort.Slice(response.Secondary.SquashFS, func(i, j int) bool {
		return response.Secondary.SquashFS[i].MountPoint < response.Secondary.SquashFS[j].MountPoint
	})

	return response, nil
}
