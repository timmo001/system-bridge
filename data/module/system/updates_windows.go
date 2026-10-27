//go:build windows

package system

import (
	"context"
	"errors"
	"log/slog"
	"os/exec"

	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils"
)

// wingetNoPackagesFound is APPINSTALLER_CLI_ERROR_NO_APPLICATIONS_FOUND, which
// winget upgrade exits with when nothing needs upgrading
const wingetNoPackagesFound = 0x8A150014

// listPackageUpdates asks winget which upgrades are waiting. ok is false when
// winget isn't installed, such as when running as a service, or the check
// fails.
func listPackageUpdates(ctx context.Context) ([]types.SystemPackageUpdate, bool) {
	if _, err := exec.LookPath("winget"); err != nil {
		return nil, false
	}
	cmd := exec.CommandContext(ctx, "winget", "upgrade", "--accept-source-agreements", "--disable-interactivity")
	utils.SetHideWindow(cmd)
	out, err := cmd.Output()

	// winget's text is translated, so read the rows of its first table, which
	// lists the upgrades, rather than its summary line
	if updates, found := wingetUpdates(out); found {
		return updates, true
	}
	var exitErr *exec.ExitError
	if err == nil || (errors.As(err, &exitErr) && uint32(exitErr.ExitCode()) == wingetNoPackagesFound) {
		return []types.SystemPackageUpdate{}, true
	}
	slog.Debug("Failed to run winget upgrade", "error", err)
	return nil, false
}
