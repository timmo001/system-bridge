//go:build windows

package system

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"log/slog"
	"os/exec"
	"regexp"
	"strings"

	"github.com/timmo001/system-bridge/utils"
)

// wingetNoPackagesFound is APPINSTALLER_CLI_ERROR_NO_APPLICATIONS_FOUND, which
// winget upgrade exits with when nothing needs upgrading
const wingetNoPackagesFound = 0x8A150014

// ansiEscape matches the terminal control sequences winget draws its progress
// with
var ansiEscape = regexp.MustCompile(`\x1b\[[0-9;?]*[A-Za-z]`)

// countPackageUpdates asks winget how many upgrades are waiting. ok is false
// when winget isn't installed, such as when running as a service, or the check
// fails.
func countPackageUpdates(ctx context.Context) (int, bool) {
	if _, err := exec.LookPath("winget"); err != nil {
		return 0, false
	}
	cmd := exec.CommandContext(ctx, "winget", "upgrade", "--accept-source-agreements", "--disable-interactivity")
	utils.SetHideWindow(cmd)
	out, err := cmd.Output()

	// winget's text is translated, so count the rows of its first table, which
	// lists the upgrades, rather than reading its summary line
	count, found := wingetTableRows(out)
	if found {
		return count, true
	}
	var exitErr *exec.ExitError
	if err == nil || (errors.As(err, &exitErr) && uint32(exitErr.ExitCode()) == wingetNoPackagesFound) {
		return 0, true
	}
	slog.Debug("Failed to run winget upgrade", "error", err)
	return 0, false
}

// wingetTableRows counts the rows of the first table, which come after its
// header and dashed separator line. A row has text where the header's last
// column starts, which the summary line after the table doesn't reach. found
// is false when there's no table.
func wingetTableRows(out []byte) (count int, found bool) {
	var header []rune
	lastColumn := -1
	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := ansiEscape.ReplaceAllString(strings.TrimSuffix(scanner.Text(), "\r"), "")
		// Progress spinners are redrawn on the same line with carriage returns
		if i := strings.LastIndexByte(line, '\r'); i >= 0 {
			line = line[i+1:]
		}
		runes := []rune(strings.TrimRight(line, " "))

		if lastColumn < 0 {
			if len(runes) > 0 && strings.Trim(string(runes), "-") == "" {
				for i := len(header) - 1; i > 0; i-- {
					if header[i-1] == ' ' && header[i] != ' ' {
						lastColumn = i
						break
					}
				}
				if lastColumn < 0 {
					return 0, false
				}
				continue
			}
			header = runes
			continue
		}

		if len(runes) <= lastColumn || runes[lastColumn-1] != ' ' || runes[lastColumn] == ' ' {
			return count, true
		}
		count++
	}
	return count, lastColumn >= 0
}
