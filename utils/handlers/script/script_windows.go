//go:build windows

package script

import (
	"bytes"
	"os/exec"

	"github.com/timmo001/system-bridge/settings"
)

// execute runs the script on Windows
func execute(scriptDef *settings.SettingsScriptDefinition) ExecuteResult {
	result := ExecuteResult{
		ScriptID: scriptDef.ID,
		ExitCode: -1,
	}

	// Create command with arguments
	cmd := exec.Command(scriptDef.Command, scriptDef.Arguments...)

	// Set working directory if specified
	if scriptDef.WorkingDir != "" {
		cmd.Dir = scriptDef.WorkingDir
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
