//go:build linux

package data

import (
	"bufio"
	"os/exec"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// StartPlayerctlListener starts a background goroutine that listens for MPRIS changes
// via playerctl and triggers the media module update on change.
func StartPlayerctlListener(dataStore *DataStore) {
	if dataStore == nil {
		return
	}

	go func() {
		cmd := exec.Command("playerctl", "-a", "metadata", "--format", "{{status}}", "-F")
		stdout, err := cmd.StdoutPipe()
		if err != nil {
			slog.Warn("playerctl listener stdout pipe failed", "error", err)
			return
		}
		if err := cmd.Start(); err != nil {
			slog.Warn("playerctl listener failed to start", "error", err)
			return
		}

		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			// On any status line, trigger an immediate media update
			if err := dataStore.TriggerModuleUpdate(types.ModuleMedia); err != nil {
				slog.Warn("Failed to trigger media update from playerctl event", "error", err)
			}
		}

		if err := scanner.Err(); err != nil {
			slog.Warn("playerctl listener scanner error", "error", err)
		}
	}()
}
