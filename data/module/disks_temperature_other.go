//go:build !linux

package data_module

// readDiskTemperatures returns an empty map on platforms without hwmon disk
// temperature support.
func readDiskTemperatures() map[string]float64 {
	return map[string]float64{}
}

// resolvePhysicalDevice is a no-op passthrough on platforms without sysfs block
// device resolution.
func resolvePhysicalDevice(device string) string {
	return device
}
