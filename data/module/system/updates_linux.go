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

	"github.com/timmo001/system-bridge/types"
)

// listPackageUpdates asks the first supported package manager found which
// updates are waiting. None of the checks need root or change the system's
// package state. ok is false when there's no supported package manager or the
// check fails.
func listPackageUpdates(ctx context.Context) ([]types.SystemPackageUpdate, bool) {
	if _, err := exec.LookPath("checkupdates"); err == nil {
		return checkupdatesList(ctx)
	}
	if _, err := exec.LookPath("apt"); err == nil {
		return aptUpgradableList(ctx)
	}
	if _, err := exec.LookPath("dnf"); err == nil {
		return dnfCheckUpdateList(ctx)
	}
	return nil, false
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

// checkupdatesList uses pacman-contrib's checkupdates on Arch, which syncs a
// copy of the package databases so the system's own aren't touched. It exits
// with 2 when there are no updates.
func checkupdatesList(ctx context.Context) ([]types.SystemPackageUpdate, bool) {
	out, err := packageManagerOutput(ctx, "checkupdates")
	if err != nil {
		if exitCode(err) == 2 {
			return []types.SystemPackageUpdate{}, true
		}
		slog.Debug("Failed to run checkupdates", "error", err)
		return nil, false
	}
	return parseCheckupdates(out), true
}

// parseCheckupdates reads checkupdates' "name current -> new" lines
func parseCheckupdates(out []byte) []types.SystemPackageUpdate {
	return parseLines(out, func(line string) (types.SystemPackageUpdate, bool) {
		fields := strings.Fields(line)
		if len(fields) != 4 || fields[2] != "->" {
			return types.SystemPackageUpdate{}, false
		}
		return types.SystemPackageUpdate{Name: fields[0], Version: fields[3], CurrentVersion: &fields[1]}, true
	})
}

// aptUpgradableList uses the package lists from the system's last apt update,
// since refreshing them needs root
func aptUpgradableList(ctx context.Context) ([]types.SystemPackageUpdate, bool) {
	out, err := packageManagerOutput(ctx, "apt", "list", "--upgradable")
	if err != nil {
		slog.Debug("Failed to run apt list", "error", err)
		return nil, false
	}
	return parseAptUpgradable(out), true
}

// parseAptUpgradable reads apt's "name/suites new arch [upgradable from:
// current]" lines
func parseAptUpgradable(out []byte) []types.SystemPackageUpdate {
	return parseLines(out, func(line string) (types.SystemPackageUpdate, bool) {
		listed, current, found := strings.Cut(line, "[upgradable from: ")
		fields := strings.Fields(listed)
		if !found || len(fields) < 2 {
			return types.SystemPackageUpdate{}, false
		}
		name, _, _ := strings.Cut(fields[0], "/")
		current = strings.TrimSuffix(strings.TrimSpace(current), "]")
		return types.SystemPackageUpdate{Name: name, Version: fields[1], CurrentVersion: &current}, true
	})
}

// dnfCheckUpdateList uses dnf check-update, which exits with 100 when there
// are updates and 0 when there are none
func dnfCheckUpdateList(ctx context.Context) ([]types.SystemPackageUpdate, bool) {
	out, err := packageManagerOutput(ctx, "dnf", "--quiet", "check-update")
	if err != nil && exitCode(err) != 100 {
		slog.Debug("Failed to run dnf check-update", "error", err)
		return nil, false
	}
	return parseDnfCheckUpdate(out), true
}

// parseDnfCheckUpdate reads dnf's "name.arch new repository" lines, stopping
// at the section of obsoleted packages after them. dnf doesn't say the
// installed version.
func parseDnfCheckUpdate(out []byte) []types.SystemPackageUpdate {
	if before, _, found := bytes.Cut(out, []byte("Obsoleting")); found {
		out = before
	}
	return parseLines(out, func(line string) (types.SystemPackageUpdate, bool) {
		fields := strings.Fields(line)
		if len(fields) != 3 {
			return types.SystemPackageUpdate{}, false
		}
		name := fields[0]
		if i := strings.LastIndexByte(name, '.'); i > 0 {
			name = name[:i]
		}
		return types.SystemPackageUpdate{Name: name, Version: fields[1]}, true
	})
}

// parseLines keeps each line parse recognises as an update
func parseLines(out []byte, parse func(line string) (types.SystemPackageUpdate, bool)) []types.SystemPackageUpdate {
	updates := []types.SystemPackageUpdate{}
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		if update, ok := parse(scanner.Text()); ok {
			updates = append(updates, update)
		}
	}
	return updates
}
