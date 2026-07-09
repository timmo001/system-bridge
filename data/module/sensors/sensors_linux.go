//go:build linux

package sensors

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/timmo001/system-bridge/types"
)

// fanChannelRegex extracts the channel prefix (e.g. "fan1") from a hwmon
// attribute filename such as "fan1_input".
var fanChannelRegex = regexp.MustCompile(`^(fan[0-9]+)_input$`)

// GetFansData reads fan speeds from Linux hwmon interfaces. It covers the
// dell_smm and dell_ddv drivers found on Dell laptops as well as any other
// driver that exposes fan*_input (motherboard Super I/O chips, GPUs, etc.).
// Returns an empty slice when no fan sensors are present.
func GetFansData() []types.Fan {
	fans := make([]types.Fan, 0)

	hwmonDirs, err := filepath.Glob("/sys/class/hwmon/hwmon*")
	if err != nil {
		return fans
	}
	sort.Strings(hwmonDirs)

	for _, dir := range hwmonDirs {
		hwmonName, _ := readTrimmed(filepath.Join(dir, "name"))

		inputs, err := filepath.Glob(filepath.Join(dir, "fan*_input"))
		if err != nil {
			continue
		}
		sort.Strings(inputs)

		for _, inputPath := range inputs {
			base := filepath.Base(inputPath)
			match := fanChannelRegex.FindStringSubmatch(base)
			if match == nil {
				continue
			}
			channel := match[1] // e.g. "fan1"

			rpm := readHwmonFloat(inputPath)
			if rpm == nil {
				continue
			}

			label, _ := readTrimmed(filepath.Join(dir, channel+"_label"))

			fans = append(fans, types.Fan{
				SensorKey: buildFanKey(hwmonName, channel),
				Name:      buildFanName(hwmonName, channel, label),
				Label:     label,
				SpeedRPM:  rpm,
				SpeedMin:  readHwmonFloat(filepath.Join(dir, channel+"_min")),
				SpeedMax:  readHwmonFloat(filepath.Join(dir, channel+"_max")),
			})
		}
	}

	fans = append(fans, getLianLiUniFansData()...)

	return fans
}

// buildFanKey produces a stable identifier for a fan sensor.
func buildFanKey(hwmonName, channel string) string {
	if hwmonName == "" {
		return channel
	}
	return sanitizeKey(hwmonName) + "_" + channel
}

// buildFanName produces a human readable name, preferring the driver-provided
// label and falling back to the hwmon name and channel.
func buildFanName(hwmonName, channel, label string) string {
	parts := make([]string, 0, 2)
	if hwmonName != "" {
		parts = append(parts, hwmonName)
	}
	if label != "" {
		parts = append(parts, label)
	} else {
		parts = append(parts, channel)
	}
	return strings.Join(parts, " ")
}

// sanitizeKey lowercases and replaces spaces with underscores to match the
// existing temperature sensor key style.
func sanitizeKey(s string) string {
	return strings.ToLower(strings.ReplaceAll(s, " ", "_"))
}

// readTrimmed reads a sysfs file and returns its trimmed content.
func readTrimmed(path string) (string, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", false
	}
	return strings.TrimSpace(string(data)), true
}

// readHwmonFloat reads a single numeric hwmon attribute, returning nil when the
// file is absent or unparseable.
func readHwmonFloat(path string) *float64 {
	s, ok := readTrimmed(path)
	if !ok {
		return nil
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &v
}
