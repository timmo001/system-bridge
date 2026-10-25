package command

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os/exec"
	"time"

	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils/handlers/command/prefab"
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

// execute runs the command with context for cancellation and timeout. A
// prefab's arguments and variables have their output placeholders filled in
// first, and once it succeeds the saved file's path is its output.
func execute(ctx context.Context, commandDef *settings.SettingsCommandDefinition) ExecuteResult {
	result := ExecuteResult{
		CommandID: commandDef.ID,
		ExitCode:  -1,
	}

	var resolved prefab.Resolved
	if commandDef.Prefab != "" {
		// ValidateCommand resolved the program already, so this only picks up
		// what it doesn't carry: the program's variables, or the built-in
		if p, ok := prefab.Get(commandDef.Prefab); ok {
			if r, err := p.Resolve(); err == nil {
				resolved = r
			}
		}
	}
	builtin := commandDef.Prefab != "" && commandDef.Command == ""
	if builtin && resolved.Run == nil {
		result.Error = fmt.Sprintf("prefab %q has nothing to run here", commandDef.Prefab)
		return result
	}

	arguments, env, output := commandDef.Arguments, []string(nil), prefab.Output{}
	if commandDef.Prefab != "" {
		// Variables belong to the prefab's own program, not an override
		if resolved.Command != "" && resolved.Command == commandDef.Command {
			env = resolved.Env
		}
		var err error
		arguments, env, output, err = prefab.Expand(commandDef.Arguments, env)
		if err != nil {
			result.Error = err.Error()
			return result
		}
		env = prefab.Env(env)
	}

	started := time.Now().Truncate(time.Second)
	if builtin {
		result = runBuiltin(ctx, commandDef, resolved.Run, arguments)
	} else {
		result = runProgram(ctx, commandDef, arguments, env)
	}

	if output.Path != "" && result.Error == "" && result.ExitCode == 0 {
		if saved, ok := output.Saved(started); ok {
			result.Stdout = saved
		} else {
			result.Error = fmt.Sprintf("nothing was saved to %s", output.Dir)
		}
	}
	return result
}

// runBuiltin runs a prefab's built-in, for platforms with no program for it
func runBuiltin(ctx context.Context, commandDef *settings.SettingsCommandDefinition, run prefab.Builtin, arguments []string) ExecuteResult {
	result := ExecuteResult{CommandID: commandDef.ID, ExitCode: -1}

	if err := run(ctx, arguments); err != nil {
		result.ExitCode = 1
		result.Stderr = err.Error()
		return result
	}
	result.ExitCode = 0
	return result
}

// runProgram runs the command's program, with env as its environment when
// it's set
func runProgram(ctx context.Context, commandDef *settings.SettingsCommandDefinition, arguments []string, env []string) ExecuteResult {
	result := ExecuteResult{
		CommandID: commandDef.ID,
		ExitCode:  -1,
	}

	// SECURITY WARNING: exec.CommandContext must NEVER use shell wrappers (e.g., /bin/sh, cmd.exe).
	// Always pass the executable path directly as the first argument and arguments as separate strings.
	// Using shell wrappers would allow shell metacharacter injection despite argument validation.
	// This is safe because exec.CommandContext does NOT invoke a shell - it executes the binary directly.
	cmd := exec.CommandContext(ctx, commandDef.Command, arguments...)
	// Once the context ends, stop waiting on output that a child process
	// still holds open, or a timeout returns only when that child exits
	cmd.WaitDelay = time.Second
	cmd.Env = env

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
