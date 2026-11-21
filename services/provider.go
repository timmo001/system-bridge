package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io/fs"
	"os/exec"
	"strings"
	"time"
)

const (
	// listTimeout fits inside the data worker's 20 second update
	listTimeout = 15 * time.Second
	// maxListOutput is as much of a provider document as is read, as for
	// commands
	maxListOutput = 1 << 20
	// maxErrorOutput is as much of stderr as goes into an error
	maxErrorOutput = 2 << 10
)

// errOutputTooLarge is a command that printed more than its limit
var errOutputTooLarge = errors.New("output too large")

// cappedBuffer keeps the first limit bytes written to it and notes that more
// came, without failing the command's writes
type cappedBuffer struct {
	buffer    bytes.Buffer
	limit     int
	truncated bool
}

func (c *cappedBuffer) Write(p []byte) (int, error) {
	if remaining := c.limit - c.buffer.Len(); remaining < len(p) {
		c.truncated = true
		if remaining > 0 {
			c.buffer.Write(p[:remaining])
		}
		return len(p), nil
	}
	c.buffer.Write(p)
	return len(p), nil
}

// result is how a provider command finished
type result struct {
	stdout          string
	stdoutTruncated bool
	stderr          string
	exitCode        int
}

// run runs argv with no shell, so its arguments are never interpreted. A
// bare program name is looked up on PATH, so ["dot", "services", "export"]
// works. It's an error when the command can't start, is cancelled or times
// out; a non-zero exit is in the result.
func run(ctx context.Context, argv []string, timeout time.Duration, limit int) (result, error) {
	if len(argv) == 0 || argv[0] == "" {
		return result{}, errors.New("no command")
	}
	path, err := exec.LookPath(argv[0])
	switch {
	case errors.Is(err, exec.ErrNotFound) || errors.Is(err, fs.ErrNotExist):
		return result{}, fmt.Errorf("%s not found", argv[0])
	case err != nil:
		return result{}, fmt.Errorf("find %s: %w", argv[0], err)
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	// SECURITY: never through a shell; the program and each argument go to
	// the system as they are
	cmd := exec.CommandContext(ctx, path, argv[1:]...)
	// Once the context ends, stop waiting on output a child still holds open
	cmd.WaitDelay = time.Second
	stdout := &cappedBuffer{limit: limit}
	stderr := &cappedBuffer{limit: maxErrorOutput}
	cmd.Stdout = stdout
	cmd.Stderr = stderr

	runErr := cmd.Run()
	out := result{
		stdout:          stdout.buffer.String(),
		stdoutTruncated: stdout.truncated,
		stderr:          strings.TrimSpace(stderr.buffer.String()),
	}

	switch {
	case errors.Is(ctx.Err(), context.DeadlineExceeded):
		return out, fmt.Errorf("timed out after %s", timeout)
	case ctx.Err() != nil:
		return out, ctx.Err()
	}
	var exitErr *exec.ExitError
	if errors.As(runErr, &exitErr) {
		out.exitCode = exitErr.ExitCode()
		return out, nil
	}
	if runErr != nil {
		return out, fmt.Errorf("run %s: %w", argv[0], runErr)
	}
	return out, nil
}

// list runs a provider's list command and returns its document
func list(ctx context.Context, argv []string) ([]byte, error) {
	out, err := run(ctx, argv, listTimeout, maxListOutput)
	if err != nil {
		return nil, withStderr(err, out.stderr)
	}
	if out.exitCode != 0 {
		return nil, withStderr(fmt.Errorf("exited with code %d", out.exitCode), out.stderr)
	}
	if out.stdoutTruncated {
		return nil, fmt.Errorf("%w: printed more than %d bytes", errOutputTooLarge, maxListOutput)
	}
	return []byte(out.stdout), nil
}

func withStderr(err error, stderr string) error {
	if stderr == "" {
		return err
	}
	return fmt.Errorf("%w: %s", err, stderr)
}
