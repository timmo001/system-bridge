//go:build linux

package system

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"log/slog"
	"os"
	"os/exec"
	"strings"
)

// countPackageUpdates asks the first supported package manager found how many
// updates are waiting. None of the checks need root or change the system's
// package state. ok is false when there's no supported package manager or the
// check fails.
func countPackageUpdates(ctx context.Context) (int, bool) {
	if _, err := exec.LookPath("checkupdates"); err == nil {
		return checkupdatesCount(ctx)
	}
	if _, err := exec.LookPath("apt"); err == nil {
		return aptUpgradableCount(ctx)
	}
	if _, err := exec.LookPath("dnf"); err == nil {
		return dnfCheckUpdateCount(ctx)
	}
	return 0, false
}

func packageManagerOutput(ctx context.Context, name string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Env = append(os.Environ(), "LC_ALL=C")
	return cmd.Output()
}

func exitCode(err error) int {
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}
	return -1
}

// checkupdatesCount uses pacman-contrib's checkupdates on Arch, which syncs a
// copy of the package databases so the system's own aren't touched. It exits
// with 2 when there are no updates.
func checkupdatesCount(ctx context.Context) (int, bool) {
	out, err := packageManagerOutput(ctx, "checkupdates")
	if err != nil {
		if exitCode(err) == 2 {
			return 0, true
		}
		slog.Debug("Failed to run checkupdates", "error", err)
		return 0, false
	}
	return countLines(out, func(line string) bool { return strings.Contains(line, " -> ") }), true
}

// aptUpgradableCount uses the package lists from the system's last apt update,
// since refreshing them needs root
func aptUpgradableCount(ctx context.Context) (int, bool) {
	out, err := packageManagerOutput(ctx, "apt", "list", "--upgradable")
	if err != nil {
		slog.Debug("Failed to run apt list", "error", err)
		return 0, false
	}
	return countLines(out, func(line string) bool { return strings.Contains(line, "[upgradable from:") }), true
}

// dnfCheckUpdateCount uses dnf check-update, which exits with 100 when there
// are updates and 0 when there are none. Each update is a "name.arch version
// repository" line, and obsoleted packages follow in a section of their own.
func dnfCheckUpdateCount(ctx context.Context) (int, bool) {
	out, err := packageManagerOutput(ctx, "dnf", "--quiet", "check-update")
	if err != nil && exitCode(err) != 100 {
		slog.Debug("Failed to run dnf check-update", "error", err)
		return 0, false
	}
	if before, _, found := bytes.Cut(out, []byte("Obsoleting")); found {
		out = before
	}
	return countLines(out, func(line string) bool { return len(strings.Fields(line)) == 3 }), true
}

func countLines(out []byte, matches func(line string) bool) int {
	count := 0
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		if matches(scanner.Text()) {
			count++
		}
	}
	return count
}
