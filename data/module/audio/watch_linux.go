//go:build linux

package audio

import (
	"bufio"
	"context"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/utils/watch"
)

// watchDebounce groups the bursts of events one change makes, such as a
// volume drag, into a single update.
const watchDebounce = 150 * time.Millisecond

// watchRetry is how long to wait before following events again after pactl
// exits, such as when the sound server restarts.
const watchRetry = 5 * time.Second

// Watch calls changed whenever an output, an input, an app's stream or the
// defaults change, until ctx is done. It follows pactl subscribe.
func Watch(ctx context.Context, changed func()) {
	trigger, stop := watch.Debounce(watchDebounce, changed)
	defer stop()

	watch.Retry(ctx, watchRetry, "pactl", func(ctx context.Context) error {
		return subscribe(ctx, trigger)
	})
}

func subscribe(ctx context.Context, trigger func()) error {
	cmd := exec.CommandContext(ctx, "pactl", "subscribe")
	cmd.Env = append(os.Environ(), "LC_ALL=C")
	out, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(out)
	for scanner.Scan() {
		if relevantEvent(scanner.Text()) {
			trigger()
		}
	}
	return cmd.Wait()
}

// relevantEvent reports whether a pactl subscribe line, such as
// "Event 'change' on sink #42", is about an output, an input, an app's
// playback stream, a card or the server's defaults, rather than a recording
// stream or client.
func relevantEvent(line string) bool {
	_, facility, ok := strings.Cut(line, "' on ")
	if !ok {
		return false
	}
	facility, _, _ = strings.Cut(facility, " #")
	switch facility {
	case "sink", "source", "sink-input", "card", "server":
		return true
	}
	return false
}
