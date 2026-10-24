//go:build linux

package networks

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// linkStats reads an interface's link speed in Mb/s and its duplex mode from
// sysfs. The kernel gives no speed for interfaces that are down, wireless or
// virtual, so speed is nil for those.
func linkStats(name string) (speed *int, duplex string) {
	dir := filepath.Join("/sys/class/net", name)

	duplex = "unknown"
	if data, err := os.ReadFile(filepath.Join(dir, "duplex")); err == nil {
		if value := strings.TrimSpace(string(data)); value == "full" || value == "half" {
			duplex = value
		}
	}

	data, err := os.ReadFile(filepath.Join(dir, "speed"))
	if err != nil {
		return nil, duplex
	}
	// The kernel reports an unknown speed as -1
	value, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil || value <= 0 {
		return nil, duplex
	}
	return &value, duplex
}
