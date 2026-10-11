//go:build linux

package data

import (
	"bufio"
	"os/exec"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/types"
)

// playerctlDebounce is how long to wait after the last playerctl line
// before refreshing the media module.
const playerctlDebounce = 300 * time.Millisecond

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
			slog.Info("playerctl listener unavailable", "error", err)
			return
		}
		if err := cmd.Start(); err != nil {
			slog.Info("playerctl listener unavailable", "error", err)
			return
		}

		// A track change emits several lines in quick succession, so
		// coalesce them into one media update instead of running playerctl
		// once per line.
		debounce := time.AfterFunc(playerctlDebounce, func() {
			if err := dataStore.TriggerModuleUpdate(types.ModuleMedia); err != nil {
				slog.Warn("Failed to trigger media update from playerctl event", "error", err)
			}
		})
		debounce.Stop()

		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			debounce.Reset(playerctlDebounce)
		}
		debounce.Stop()

		_ = cmd.Wait()

		if err := scanner.Err(); err != nil {
			slog.Info("playerctl listener stopped", "error", err)
		}
	}()
}
