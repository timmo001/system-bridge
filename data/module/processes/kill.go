// Package processes ends processes the processes module lists.
package processes

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"

	"github.com/shirou/gopsutil/v4/process"
)

// ErrNotFound is returned when no process has the id given
var ErrNotFound = errors.New("no process with that id")

// ErrRefused is returned for a process System Bridge won't end, such as
// itself
var ErrRefused = errors.New("refused to end the process")

// Kill ends a process by its id from the processes module. It asks the
// process to stop, as closing it would, or with force ends it straight away.
// The system decides which processes the backend's user may end.
func Kill(ctx context.Context, id int, force bool) error {
	if id == os.Getpid() {
		return fmt.Errorf("%w: it's System Bridge, use EXIT_APPLICATION to stop it", ErrRefused)
	}
	if id <= 0 || id > math.MaxInt32 {
		return fmt.Errorf("process %d: %w", id, ErrNotFound)
	}
	p, err := process.NewProcessWithContext(ctx, int32(id))
	if err != nil {
		return fmt.Errorf("process %d: %w", id, ErrNotFound)
	}
	if force {
		err = p.KillWithContext(ctx)
	} else {
		err = p.TerminateWithContext(ctx)
	}
	if err != nil {
		return fmt.Errorf("failed to end process %d: %w", id, err)
	}
	return nil
}
