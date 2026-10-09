//go:build linux

package system

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/process"
	"github.com/timmo001/system-bridge/types"
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

	pipeWireApps, pipeWireOK := pipeWireCaptureApps("Stream/Input/Video")

	// Resolve process names
	names := make([]string, 0, len(pidHasVideo)+len(pipeWireApps))
	for pid := range pidHasVideo {
		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}
		name, err := p.Name()
		if err != nil || name == "" {
			continue
		}
		// PipeWire opens the device for apps using the camera portal; those
		// apps are named from their streams below instead.
		if pipeWireOK && (name == "pipewire" || name == "wireplumber") {
			continue
		}
		if !slices.Contains(names, name) {
			names = append(names, name)
		}
	}
	for _, app := range pipeWireApps {
		if !slices.Contains(names, app) {
			names = append(names, app)
		}
	}

	if len(names) == 0 {
		return nil
	}
	return names
}

// GetMicrophoneUsage attempts to detect apps currently using the microphone on Linux.
// It reads running PipeWire capture streams, falling back to ALSA capture substream
// status files under /proc/asound/ when PipeWire is unavailable.
func GetMicrophoneUsage() []string {
	// PipeWire holds the ALSA device itself, so the ALSA owner_pid would
	// always name pipewire rather than the app recording.
	if apps, ok := pipeWireCaptureApps("Stream/Input/Audio"); ok {
		return apps
	}

	names := make([]string, 0)

	statusFiles, err := filepath.Glob("/proc/asound/card*/pcm*c/sub*/status")
	if err != nil {
		slog.Debug("Microphone usage glob failed", "error", err)
		return names
	}

	pidSet := make(map[int32]bool)
	for _, sf := range statusFiles {
		data, err := os.ReadFile(sf)
		if err != nil {
			slog.Debug("Failed to read ALSA capture status file", "path", sf, "error", err)
			continue
		}
		content := string(data)

		// Check if the capture stream is actively running
		if !strings.Contains(content, "state: RUNNING") {
			continue
		}

		// Extract owner_pid from the status file
		for _, line := range strings.Split(content, "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "owner_pid") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) != 2 {
					continue
				}
				pidStr := strings.TrimSpace(parts[1])
				pidVal, err := strconv.Atoi(pidStr)
				if err != nil {
					slog.Debug("Failed to parse owner_pid from ALSA status", "path", sf, "value", pidStr, "error", err)
					continue
				}
				if pidVal <= 0 {
					continue
				}
				pidSet[int32(pidVal)] = true
			}
		}
	}

	// Resolve process names
	for pid := range pidSet {
		p, err := process.NewProcess(pid)
		if err != nil {
			slog.Debug("Failed to find process for microphone usage", "pid", pid, "error", err)
			continue
		}
		name, err := p.Name()
		if err != nil {
			slog.Debug("Failed to get process name for microphone usage", "pid", pid, "error", err)
			continue
		}
		if name != "" {
			names = append(names, name)
		}
	}
	return names
}

const pipeWireDumpTimeout = 2 * time.Second

// pipeWireCaptureApps returns the apps with a running PipeWire capture stream
// of mediaClass, such as "Stream/Input/Audio". ok is false when PipeWire
// can't be queried, so callers can fall back to another source.
func pipeWireCaptureApps(mediaClass string) (apps []string, ok bool) {
	ctx, cancel := context.WithTimeout(context.Background(), pipeWireDumpTimeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, "pw-dump").Output()
	if err != nil {
		slog.Debug("Failed to run pw-dump", "error", err)
		return nil, false
	}

	var objects []struct {
		Type string `json:"type"`
		Info struct {
			State string         `json:"state"`
			Props map[string]any `json:"props"`
		} `json:"info"`
	}
	if err := json.Unmarshal(out, &objects); err != nil {
		slog.Debug("Failed to parse pw-dump output", "error", err)
		return nil, false
	}

	apps = make([]string, 0)
	for _, o := range objects {
		props := o.Info.Props
		if o.Type != "PipeWire:Interface:Node" || o.Info.State != "running" || props["media.class"] != mediaClass {
			continue
		}
		// Streams recording another app's output, such as a screen recorder
		// capturing desktop audio, aren't using the microphone.
		if captureSink := props["stream.capture.sink"]; captureSink == true || captureSink == "true" {
			continue
		}
		for _, key := range []string{"application.name", "application.process.binary", "node.name"} {
			if name, _ := props[key].(string); name != "" {
				if !slices.Contains(apps, name) {
					apps = append(apps, name)
				}
				break
			}
		}
	}
	return apps, true
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
					slog.Debug("Found PSU power usage", "hwmon", hwmonDir, "name", name, "power_watts", powerWatts)
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

// GetDeviceInfo reads hardware and firmware identity from the DMI/SMBIOS sysfs
// interface (/sys/class/dmi/id). Returns nil when no DMI fields are readable.
// Root-only fields such as product_serial are intentionally not read.
func GetDeviceInfo() *types.DeviceInfo {
	const dmiBase = "/sys/class/dmi/id"

	read := func(file string) *string {
		data, err := os.ReadFile(filepath.Join(dmiBase, file))
		if err != nil {
			return nil
		}
		value := strings.TrimSpace(string(data))
		// DMI fields are frequently populated with placeholder strings on
		// consumer hardware; treat these as absent.
		if value == "" {
			return nil
		}
		switch strings.ToLower(value) {
		case "to be filled by o.e.m.", "default string", "none", "not specified", "system manufacturer", "system product name", "unknown":
			return nil
		}
		return &value
	}

	info := &types.DeviceInfo{
		Manufacturer: read("sys_vendor"),
		Model:        read("product_name"),
		Version:      read("product_version"),
		BoardVendor:  read("board_vendor"),
		BoardName:    read("board_name"),
		BIOSVendor:   read("bios_vendor"),
		BIOSVersion:  read("bios_version"),
		ChassisType:  chassisTypeName(read("chassis_type")),
	}

	// Return nil when nothing meaningful was found.
	if info.Manufacturer == nil && info.Model == nil && info.Version == nil &&
		info.BoardVendor == nil && info.BoardName == nil &&
		info.BIOSVendor == nil && info.BIOSVersion == nil && info.ChassisType == nil {
		return nil
	}

	return info
}

// chassisTypeName maps an SMBIOS chassis type number to a human readable form.
// When the code is unknown the raw value is preserved.
func chassisTypeName(raw *string) *string {
	if raw == nil {
		return nil
	}
	code, err := strconv.Atoi(*raw)
	if err != nil {
		return raw
	}
	names := map[int]string{
		1:  "Other",
		2:  "Unknown",
		3:  "Desktop",
		4:  "Low Profile Desktop",
		5:  "Pizza Box",
		6:  "Mini Tower",
		7:  "Tower",
		8:  "Portable",
		9:  "Laptop",
		10: "Notebook",
		11: "Handheld",
		12: "Docking Station",
		13: "All in One",
		14: "Sub Notebook",
		15: "Space-saving",
		16: "Lunch Box",
		17: "Main Server Chassis",
		18: "Expansion Chassis",
		21: "Peripheral Chassis",
		23: "Rack Mount Chassis",
		24: "Sealed-case PC",
		30: "Tablet",
		31: "Convertible",
		32: "Detachable",
	}
	if name, ok := names[code]; ok {
		return &name
	}
	return raw
}
