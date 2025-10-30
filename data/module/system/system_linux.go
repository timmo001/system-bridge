//go:build linux

package system

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"log/slog"

	"github.com/shirou/gopsutil/v4/process"
)

// GetCameraUsage attempts to detect processes currently using video devices on Linux
// by scanning /proc/*/fd symlinks for /dev/video* files.
func GetCameraUsage() []string {
	const devPrefix = "/dev/video"
	pids, err := filepath.Glob("/proc/[0-9]*/fd/*")
	if err != nil {
		slog.Debug("camera usage glob failed", "err", err)
		return nil
	}

	// Map pid -> seen
	pidHasVideo := make(map[int32]bool)
	for _, fdpath := range pids {
		target, err := os.Readlink(fdpath)
		if err != nil {
			continue
		}
		if strings.HasPrefix(target, devPrefix) {
			// Extract pid from path: /proc/<pid>/fd/<n>
			parts := strings.Split(fdpath, "/")
			if len(parts) < 4 {
				continue
			}
			// parts[2] should be pid as string
			var pidStr string
			for i, p := range parts {
				if i > 0 && parts[i-1] == "proc" {
					pidStr = p
					break
				}
			}
			if pidStr == "" {
				continue
			}
			// Fast parse to int32
			var pid int32
			for i := 0; i < len(pidStr); i++ {
				c := pidStr[i]
				if c < '0' || c > '9' {
					pid = 0
					break
				}
				pid = pid*10 + int32(c-'0')
			}
			if pid > 0 {
				pidHasVideo[pid] = true
			}
		}
	}

	if len(pidHasVideo) == 0 {
		return nil
	}

	// Resolve process names
	names := make([]string, 0, len(pidHasVideo))
	for pid := range pidHasVideo {
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}
		if name, err := p.Name(); err == nil && name != "" {
			names = append(names, name)
		}
	}
	return names
}

// GetPendingReboot best-effort check for common reboot-required files on Debian/Ubuntu.
// Returns pointer to bool when known, or nil when unknown.
func GetPendingReboot() *bool {
	candidates := []string{
		"/run/reboot-required",
		"/var/run/reboot-required",
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			v := true
			return &v
		}
	}
	return nil
}

// GetPSUPowerUsage attempts to read PSU power usage from hwmon interfaces on Linux.
// This function specifically looks for Corsair PSU sensors via the corsair_psu driver.
// Returns power usage in watts, or nil if not available.
func GetPSUPowerUsage() *float64 {
	// Look for hwmon directories that might contain PSU power sensors
	hwmonDirs, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil {
		slog.Debug("Failed to glob hwmon directories", "error", err)
		return nil
	}

	for _, hwmonDir := range hwmonDirs {
		// Check if this is a Corsair PSU by looking at the name file
		nameFile := filepath.Join(hwmonDir, "name")
		nameData, err := os.ReadFile(nameFile)
		if err != nil {
			continue
		}
		name := strings.TrimSpace(string(nameData))

		// Look for corsair_psu driver or similar PSU-related names
		if strings.Contains(strings.ToLower(name), "corsair") ||
			strings.Contains(strings.ToLower(name), "psu") ||
			strings.Contains(strings.ToLower(name), "rmi") {

			// Try to read power1_input (total power consumption)
			powerFile := filepath.Join(hwmonDir, "power1_input")
			if powerData, err := os.ReadFile(powerFile); err == nil {
				valueStr := strings.TrimSpace(string(powerData))
				if value, err := strconv.ParseFloat(valueStr, 64); err == nil {
					// Convert from microwatts to watts
					powerWatts := value / 1_000_000
					slog.Info("Found PSU power usage", "hwmon", hwmonDir, "name", name, "power_watts", powerWatts)
					return &powerWatts
				}
			}
		}
	}

	// Fallback: try to find any power1_input file in hwmon directories
	// This covers cases where the PSU might not be properly identified by name
	for _, hwmonDir := range hwmonDirs {
		powerFile := filepath.Join(hwmonDir, "power1_input")
		if powerData, err := os.ReadFile(powerFile); err == nil {
			// Check if there's a corresponding power1_label to see if it's PSU-related
			labelFile := filepath.Join(hwmonDir, "power1_label")
			if labelData, err := os.ReadFile(labelFile); err == nil {
				label := strings.ToLower(strings.TrimSpace(string(labelData)))
				if strings.Contains(label, "psu") || strings.Contains(label, "power") {
					valueStr := strings.TrimSpace(string(powerData))
					if value, err := strconv.ParseFloat(valueStr, 64); err == nil {
						powerWatts := value / 1_000_000
						slog.Debug("Found PSU power usage via label", "hwmon", hwmonDir, "label", label, "power_watts", powerWatts)
						return &powerWatts
					}
				}
			}
		}
	}

	slog.Debug("No PSU power usage sensors found")
	return nil
}
