package data_module

import (
	"context"
	"sort"
	"testing"

	"github.com/shirou/gopsutil/v4/disk"
	"github.com/timmo001/system-bridge/types"
)

func TestDiskModule_Update_DeterministicOrdering(t *testing.T) {
	module := DiskModule{}

	// Run Update multiple times and verify ordering is always consistent.
	// Go map iteration is randomized, so without sorting this would
	// produce different orderings across invocations.
	const iterations = 10
	var firstResult types.DisksData

	for i := 0; i < iterations; i++ {
		result, err := module.Update(context.Background())
		if err != nil {
			t.Fatalf("Update() returned error: %v", err)
		}

		disksData, ok := result.(types.DisksData)
		if !ok {
			t.Fatalf("Update() returned unexpected type: %T", result)
		}

		// Verify devices are sorted by name
		if !sort.SliceIsSorted(disksData.Devices, func(i, j int) bool {
			return disksData.Devices[i].Name < disksData.Devices[j].Name
		}) {
			names := make([]string, len(disksData.Devices))
			for idx, d := range disksData.Devices {
				names[idx] = d.Name
			}
			t.Fatalf("iteration %d: devices not sorted by name: %v", i, names)
		}

		// Verify partitions within each device are sorted by mount point
		for _, device := range disksData.Devices {
			if !sort.SliceIsSorted(device.Partitions, func(a, b int) bool {
				return device.Partitions[a].MountPoint < device.Partitions[b].MountPoint
			}) {
				mounts := make([]string, len(device.Partitions))
				for idx, p := range device.Partitions {
					mounts[idx] = p.MountPoint
				}
				t.Fatalf("iteration %d: partitions for %s not sorted by mount point: %v",
					i, device.Name, mounts)
			}
		}

		// Compare against first result to verify consistency
		if i == 0 {
			firstResult = disksData
		} else {
			if len(disksData.Devices) != len(firstResult.Devices) {
				t.Fatalf("iteration %d: device count changed (%d vs %d)",
					i, len(disksData.Devices), len(firstResult.Devices))
			}
			for j := range disksData.Devices {
				if disksData.Devices[j].Name != firstResult.Devices[j].Name {
					t.Fatalf("iteration %d: device[%d] name mismatch: %q vs %q",
						i, j, disksData.Devices[j].Name, firstResult.Devices[j].Name)
				}
			}
		}
	}
}

func TestDiskModule_Update_NoVirtualFilesystems(t *testing.T) {
	module := DiskModule{}

	result, err := module.Update(context.Background())
	if err != nil {
		t.Fatalf("Update() returned error: %v", err)
	}

	disksData, ok := result.(types.DisksData)
	if !ok {
		t.Fatalf("Update() returned unexpected type: %T", result)
	}

	// All returned devices should have names starting with /dev/
	for _, device := range disksData.Devices {
		if len(device.Name) < 5 || device.Name[:5] != "/dev/" {
			t.Errorf("device %q does not start with /dev/", device.Name)
		}
	}

	// No squashfs partitions should be present (unless explicitly allowed)
	for _, device := range disksData.Devices {
		for _, partition := range device.Partitions {
			if partition.FilesystemType == "squashfs" {
				t.Errorf("squashfs partition found: %s (should be filtered by default)", partition.MountPoint)
			}
		}
	}
}

func TestClassifyMount(t *testing.T) {
	tests := []struct {
		name     string
		input    disk.PartitionStat
		expected types.DiskMountCategory
	}{
		{
			name: "primary ext4 partition",
			input: disk.PartitionStat{
				Device:     "/dev/sda1",
				Mountpoint: "/",
				Fstype:     "ext4",
				Opts:       []string{"rw", "relatime"},
			},
			expected: types.DiskMountCategoryPrimary,
		},
		{
			name: "primary btrfs without bind",
			input: disk.PartitionStat{
				Device:     "/dev/dm-0",
				Mountpoint: "/",
				Fstype:     "btrfs",
				Opts:       []string{"rw", "relatime"},
			},
			expected: types.DiskMountCategoryPrimary,
		},
		{
			name: "bind mount (btrfs subvolume)",
			input: disk.PartitionStat{
				Device:     "/dev/dm-0",
				Mountpoint: "/home",
				Fstype:     "btrfs",
				Opts:       []string{"rw", "relatime", "bind"},
			},
			expected: types.DiskMountCategoryBind,
		},
		{
			name: "squashfs snap mount",
			input: disk.PartitionStat{
				Device:     "/dev/loop0",
				Mountpoint: "/snap/snapd/25202",
				Fstype:     "squashfs",
				Opts:       []string{"ro", "nodev", "relatime"},
			},
			expected: types.DiskMountCategorySquashFS,
		},
		{
			name: "vfat boot partition",
			input: disk.PartitionStat{
				Device:     "/dev/nvme0n1p1",
				Mountpoint: "/boot",
				Fstype:     "vfat",
				Opts:       []string{"rw", "relatime"},
			},
			expected: types.DiskMountCategoryPrimary,
		},
		{
			name: "root btrfs with bind is still primary",
			input: disk.PartitionStat{
				Device:     "/dev/dm-0",
				Mountpoint: "/",
				Fstype:     "btrfs",
				Opts:       []string{"rw", "relatime", "bind"},
			},
			expected: types.DiskMountCategoryPrimary,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ClassifyMount(tt.input)
			if result != tt.expected {
				t.Errorf("ClassifyMount() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// mockPartitions returns a fixed set of partitions for testing.
func mockPartitions(_ bool) ([]disk.PartitionStat, error) {
	return []disk.PartitionStat{
		{Device: "/dev/nvme0n1p2", Mountpoint: "/", Fstype: "ext4", Opts: []string{"rw", "relatime"}},
		{Device: "/dev/nvme0n1p1", Mountpoint: "/boot", Fstype: "vfat", Opts: []string{"rw", "relatime"}},
		{Device: "/dev/dm-0", Mountpoint: "/home", Fstype: "btrfs", Opts: []string{"rw", "relatime", "bind"}},
		{Device: "/dev/loop0", Mountpoint: "/snap/snapd/25202", Fstype: "squashfs", Opts: []string{"ro", "nodev"}},
		{Device: "tmpfs", Mountpoint: "/tmp", Fstype: "tmpfs", Opts: []string{"rw"}},
		{Device: "overlay", Mountpoint: "/var/lib/docker/overlay2/abc/merged", Fstype: "overlay", Opts: []string{"rw"}},
	}, nil
}

// mockUsage returns synthetic usage stats for any mount point.
func mockUsage(_ string) (*disk.UsageStat, error) {
	return &disk.UsageStat{
		Total:       100 * 1024 * 1024 * 1024,
		Used:        40 * 1024 * 1024 * 1024,
		Free:        60 * 1024 * 1024 * 1024,
		UsedPercent: 40.0,
	}, nil
}

func TestGetAllMountsCategorized(t *testing.T) {
	// Replace real functions with mocks for deterministic results.
	origPartitions := partitionsFunc
	origUsage := usageFunc
	partitionsFunc = mockPartitions
	usageFunc = mockUsage
	t.Cleanup(func() {
		partitionsFunc = origPartitions
		usageFunc = origUsage
	})

	response, err := GetAllMountsCategorized()
	if err != nil {
		t.Fatalf("GetAllMountsCategorized() returned error: %v", err)
	}

	// Primary mounts: / and /boot (both are /dev/ devices, not bind/squashfs)
	if len(response.Primary) != 2 {
		t.Fatalf("expected 2 primary mounts, got %d", len(response.Primary))
	}

	// All primary mounts should be real devices
	for _, m := range response.Primary {
		if len(m.Device) < 5 || m.Device[:5] != "/dev/" {
			t.Errorf("primary mount device %q does not start with /dev/", m.Device)
		}
		if m.Category != types.DiskMountCategoryPrimary {
			t.Errorf("primary mount %q has wrong category: %q", m.MountPoint, m.Category)
		}
	}

	// Verify secondary bind mounts
	if len(response.Secondary.Bind) != 1 {
		t.Fatalf("expected 1 bind mount, got %d", len(response.Secondary.Bind))
	}
	if response.Secondary.Bind[0].MountPoint != "/home" {
		t.Errorf("expected bind mount at /home, got %q", response.Secondary.Bind[0].MountPoint)
	}
	if response.Secondary.Bind[0].Category != types.DiskMountCategoryBind {
		t.Errorf("bind mount has wrong category: %q", response.Secondary.Bind[0].Category)
	}

	// Verify secondary squashfs mounts
	if len(response.Secondary.SquashFS) != 1 {
		t.Fatalf("expected 1 squashfs mount, got %d", len(response.Secondary.SquashFS))
	}
	if response.Secondary.SquashFS[0].Category != types.DiskMountCategorySquashFS {
		t.Errorf("squashfs mount has wrong category: %q", response.Secondary.SquashFS[0].Category)
	}

	// Non-/dev/ devices (tmpfs, overlay) should be excluded entirely
	allMounts := append(append(response.Primary, response.Secondary.Bind...), response.Secondary.SquashFS...)
	for _, m := range allMounts {
		if m.Device == "tmpfs" || m.Device == "overlay" {
			t.Errorf("virtual filesystem %q should have been filtered out", m.Device)
		}
	}

	// Verify primary mounts are sorted by mount point
	if !sort.SliceIsSorted(response.Primary, func(i, j int) bool {
		return response.Primary[i].MountPoint < response.Primary[j].MountPoint
	}) {
		t.Error("primary mounts are not sorted by mount point")
	}

	// Verify usage stats are populated
	for _, m := range response.Primary {
		if m.Usage == nil {
			t.Errorf("primary mount %q has nil usage", m.MountPoint)
		}
	}
}
