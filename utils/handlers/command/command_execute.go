package command

import (
	"bytes"
	"os/exec"

	"github.com/timmo001/system-bridge/settings"
)

// execute runs the command
func execute(commandDef *settings.SettingsCommandDefinition) ExecuteResult {
	result := ExecuteResult{
		CommandID: commandDef.ID,
		ExitCode:  -1,
	}

	// Create command with arguments
	cmd := exec.Command(commandDef.Command, commandDef.Arguments...)

	// Set working directory if specified
	if commandDef.WorkingDir != "" {
		cmd.Dir = commandDef.WorkingDir
	}

	// Capture stdout and stderr
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	// Execute the command
	err := cmd.Run()

	// Capture output
	result.Stdout = stdout.String()
	result.Stderr = stderr.String()

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
