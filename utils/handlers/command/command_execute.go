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

	// SECURITY WARNING: exec.CommandContext must NEVER use shell wrappers (e.g., /bin/sh, cmd.exe).
	// Always pass the executable path directly as the first argument and arguments as separate strings.
	// Using shell wrappers would allow shell metacharacter injection despite argument validation.
	// This is safe because exec.CommandContext does NOT invoke a shell - it executes the binary directly.
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
	// Reserve space for truncation message: "\n... (output truncated)" = 26 bytes
	const truncationMessage = "\n... (output truncated)"
	const truncationMessageLen = len(truncationMessage)

	result.Stdout = stdoutWriter.String()
	result.Stderr = stderrWriter.String()

	// Check if output was truncated and ensure final output doesn't exceed MaxOutputSize
	if stdoutWriter.written >= MaxOutputSize {
		// Truncate to make room for the truncation message
		maxContentLen := int64(len(result.Stdout))
		if maxContentLen > MaxOutputSize-int64(truncationMessageLen) {
			result.Stdout = result.Stdout[:MaxOutputSize-int64(truncationMessageLen)]
		}
		result.Stdout += truncationMessage
	}
	if stderrWriter.written >= MaxOutputSize {
		// Truncate to make room for the truncation message
		maxContentLen := int64(len(result.Stderr))
		if maxContentLen > MaxOutputSize-int64(truncationMessageLen) {
			result.Stderr = result.Stderr[:MaxOutputSize-int64(truncationMessageLen)]
		}
		result.Stderr += truncationMessage
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
