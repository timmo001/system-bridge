package data_module

import (
	"context"
	"sort"
	"testing"

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
