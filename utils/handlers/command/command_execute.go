package command

import (
	"bytes"
	"context"
	"io"
	"os/exec"

	"github.com/timmo001/system-bridge/settings"
)

// limitedWriter limits the amount of data written to prevent memory exhaustion
type limitedWriter struct {
	buffer  bytes.Buffer
	limit   int64
	written int64
}

func (lw *limitedWriter) Write(p []byte) (n int, err error) {
	remaining := lw.limit - lw.written
	if remaining <= 0 {
		return 0, io.ErrShortWrite
	}
	if int64(len(p)) > remaining {
		p = p[:remaining]
		err = io.ErrShortWrite
	}
	n, writeErr := lw.buffer.Write(p)
	lw.written += int64(n)
	if writeErr != nil {
		return n, writeErr
	}
	return n, err
}

func (lw *limitedWriter) String() string {
	return lw.buffer.String()
}

// execute runs the command with context for cancellation and timeout
func execute(ctx context.Context, commandDef *settings.SettingsCommandDefinition) ExecuteResult {
	result := ExecuteResult{
		CommandID: commandDef.ID,
		ExitCode:  -1,
	}

	// Create command with context for cancellation and timeout
	cmd := exec.CommandContext(ctx, commandDef.Command, commandDef.Arguments...)

	// Set working directory if specified
	if commandDef.WorkingDir != "" {
		cmd.Dir = commandDef.WorkingDir
	}

	// Capture stdout and stderr with size limits
	stdoutWriter := &limitedWriter{limit: MaxOutputSize}
	stderrWriter := &limitedWriter{limit: MaxOutputSize}
	cmd.Stdout = stdoutWriter
	cmd.Stderr = stderrWriter

	// Execute the command
	err := cmd.Run()

	// Capture output (may be truncated)
	result.Stdout = stdoutWriter.String()
	result.Stderr = stderrWriter.String()

	// Check if output was truncated
	if stdoutWriter.written >= MaxOutputSize {
		result.Stdout += "\n... (output truncated)"
	}
	if stderrWriter.written >= MaxOutputSize {
		result.Stderr += "\n... (output truncated)"
	}

	// Check for context cancellation
	if ctx.Err() == context.DeadlineExceeded {
		result.Error = "command execution timeout"
		return result
	}
	if ctx.Err() == context.Canceled {
		result.Error = "command execution canceled"
		return result
	}

	// Get exit code
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		} else {
			// Command failed to start or other error
			result.Error = err.Error()
			return result
		}
	} else {
		result.ExitCode = 0
	}

	return result
}
