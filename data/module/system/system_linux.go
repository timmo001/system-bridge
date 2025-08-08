//go:build linux
// +build linux

package system

import (
	"os"
	"path/filepath"
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
