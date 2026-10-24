//go:build darwin

package system

import (
	"context"
	"log/slog"
	"os/exec"
	"regexp"
	"strconv"
	"time"
)

var hidIdleTime = regexp.MustCompile(`"HIDIdleTime" = (\d+)`)

// GetIdleState returns the seconds since the user's last input. macOS has no
// lock state we can read without private frameworks, so that stays unknown.
func GetIdleState() (*uint64, *bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	output, err := exec.CommandContext(ctx, "ioreg", "-c", "IOHIDSystem", "-d", "4").Output()
	if err != nil {
		slog.Debug("Failed to read HIDIdleTime", "error", err)
		return nil, nil
	}
	match := hidIdleTime.FindSubmatch(output)
	if match == nil {
		return nil, nil
	}
	nanoseconds, err := strconv.ParseUint(string(match[1]), 10, 64)
	if err != nil {
		return nil, nil
	}
	seconds := nanoseconds / uint64(time.Second)
	return &seconds, nil
}
