// Package reexec restarts the backend when a package upgrade replaces its
// executable, so the new version runs without a manual restart.
package reexec

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

const (
	pollInterval = 30 * time.Second
	// settleDelay gives the package manager time to finish writing the file.
	settleDelay = 5 * time.Second
)

// Watch calls onReplaced with the executable's path once a new, complete
// executable replaces the one the process started from, then returns. It
// returns without calling it when ctx is done, or straight away where
// re-executing is not supported.
func Watch(ctx context.Context, onReplaced func(path string)) {
	if !supported {
		return
	}
	path, err := executablePath()
	if err != nil {
		slog.Warn("Not watching for upgrades", "error", err)
		return
	}
	started, err := os.Stat(path)
	if err != nil {
		slog.Warn("Not watching for upgrades", "path", path, "error", err)
		return
	}

	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		replaced, ok := replacement(path, started)
		if !ok {
			continue
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(settleDelay):
		}
		settled, ok := replacement(path, started)
		if !ok || !os.SameFile(settled, replaced) || settled.Size() != replaced.Size() || !settled.ModTime().Equal(replaced.ModTime()) {
			continue
		}
		onReplaced(path)
		return
	}
}

// replacement returns the file at path when it is an executable other than
// started. A running executable can't be written in place, so an upgrade
// always puts a new file there.
func replacement(path string, started os.FileInfo) (os.FileInfo, bool) {
	info, err := os.Stat(path)
	if err != nil || !info.Mode().IsRegular() || info.Mode().Perm()&0o111 == 0 || os.SameFile(info, started) {
		return nil, false
	}
	return info, true
}

func executablePath() (string, error) {
	path, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("could not find the executable: %w", err)
	}
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		return "", fmt.Errorf("could not resolve the executable %s: %w", path, err)
	}
	return resolved, nil
}
