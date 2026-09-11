package confirmation

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"sync"

	"github.com/timmo001/system-bridge/utils"
)

const QuitMessage = "Quit System Bridge? System information and controls will be unavailable until you start it again."

var dialogMu sync.Mutex

// Ask shows a desktop confirmation with Cancel selected by default.
func Ask(ctx context.Context, title, message string) (bool, error) {
	if !dialogMu.TryLock() {
		return false, nil
	}
	defer dialogMu.Unlock()

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		quote := func(value string) string { return "'" + strings.ReplaceAll(value, "'", "''") + "'" }
		script := "$shell = New-Object -ComObject WScript.Shell; if ($shell.Popup(" + quote(message) + ", 0, " + quote(title) + ", 292) -eq 6) { exit 0 }; exit 1"
		cmd = exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command", script)
		utils.SetHideWindow(cmd)
	case "darwin":
		script := "display dialog " + strconv.Quote(message) + " with title " + strconv.Quote(title) + " buttons {\"Cancel\", \"Confirm\"} default button \"Cancel\" cancel button \"Cancel\""
		cmd = exec.CommandContext(ctx, "osascript", "-e", script)
	default:
		cmd = exec.CommandContext(ctx, "zenity", "--question", "--no-markup", "--default-cancel", "--title="+title, "--text="+message, "--ok-label=Confirm", "--cancel-label=Cancel")
	}
	if err := cmd.Run(); err != nil {
		if ctx.Err() != nil {
			return false, ctx.Err()
		}
		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) && exitErr.ExitCode() == 1 {
			return false, nil
		}
		return false, fmt.Errorf("show confirmation: %w", err)
	}
	return true, nil
}
