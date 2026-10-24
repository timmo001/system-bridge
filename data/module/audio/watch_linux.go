//go:build linux

package audio

import (
	"bufio"
	"context"
	"log/slog"
	"os"
	"os/exec"
	"strings"
	"time"
)

// watchDebounce groups the bursts of events one change makes, such as a
// volume drag, into a single update.
const watchDebounce = 150 * time.Millisecond

// watchRetry is how long to wait before following events again after pactl
// exits, such as when the sound server restarts.
const watchRetry = 5 * time.Second

// Watch calls changed whenever an output, an input or the defaults change,
// until ctx is done. It follows pactl subscribe.
func Watch(ctx context.Context, changed func()) {
	for {
		if err := subscribe(ctx, changed); err != nil && ctx.Err() == nil {
			slog.Debug("Stopped following audio events", "error", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(watchRetry):
		}
	}
}

func subscribe(ctx context.Context, changed func()) error {
	cmd := exec.CommandContext(ctx, "pactl", "subscribe")
	cmd.Env = append(os.Environ(), "LC_ALL=C")
	out, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}

	var timer *time.Timer
	defer func() {
		if timer != nil {
			timer.Stop()
		}
	}()

	scanner := bufio.NewScanner(out)
	for scanner.Scan() {
		if !relevantEvent(scanner.Text()) {
			continue
		}
		if timer == nil {
			timer = time.AfterFunc(watchDebounce, changed)
		} else {
			timer.Reset(watchDebounce)
		}
	}
	return cmd.Wait()
}

// relevantEvent reports whether a pactl subscribe line, such as
// "Event 'change' on sink #42", is about an output, an input, a card or the
// server's defaults, rather than a stream or client.
func relevantEvent(line string) bool {
	_, facility, ok := strings.Cut(line, "' on ")
	if !ok {
		return false
	}
	facility, _, _ = strings.Cut(facility, " #")
	switch facility {
	case "sink", "source", "card", "server":
		return true
	}
	return false
}
