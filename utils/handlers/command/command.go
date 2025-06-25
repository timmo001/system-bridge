package command

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"

	"github.com/charmbracelet/log"
)

// CommandResult represents the result of a command execution
type CommandResult struct {
	ExitCode int    `json:"exitCode"`
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	Error    string `json:"error,omitempty"`
}

// ExecuteCommand executes a command with given arguments and returns the result
func ExecuteCommand(command string, args []string) (*CommandResult, error) {
	log.Infof("Executing command: %s %v", command, args)

	// Create the command
	cmd := exec.Command(command, args...)

	// Capture stdout and stderr
	stdout, err := cmd.Output()
	if err != nil {
		// Handle execution error
		if exitError, ok := err.(*exec.ExitError); ok {
			return &CommandResult{
				ExitCode: exitError.ExitCode(),
				Stdout:   string(stdout),
				Stderr:   string(exitError.Stderr),
				Error:    fmt.Sprintf("Command failed with exit code %d", exitError.ExitCode()),
			}, nil
		}
		return nil, fmt.Errorf("failed to execute command: %w", err)
	}

	return &CommandResult{
		ExitCode: 0,
		Stdout:   string(stdout),
		Stderr:   "",
	}, nil
}

// ValidateCommand validates if a command is safe to execute
func ValidateCommand(command string) error {
	// Basic security checks
	if strings.TrimSpace(command) == "" {
		return fmt.Errorf("command cannot be empty")
	}

	// Check for dangerous command patterns
	dangerousPatterns := []string{
		"rm -rf",
		"del /f",
		"format",
		"shutdown",
		"reboot",
		"halt",
		"poweroff",
		"sudo rm",
		"sudo del",
	}

	lowerCommand := strings.ToLower(command)
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowerCommand, pattern) {
			log.Warnf("Potentially dangerous command detected: %s", command)
			// Don't block, just warn - let the allow-list handle security
		}
	}

	return nil
}

// GetPlatformSpecificCommand adjusts command for the current platform
func GetPlatformSpecificCommand(command string, args []string) (string, []string, error) {
	switch runtime.GOOS {
	case "windows":
		// On Windows, if the command doesn't have an extension, try to find it
		if !strings.Contains(command, ".") {
			// Common Windows executables
			extensions := []string{".exe", ".com", ".bat", ".cmd"}
			for _, ext := range extensions {
				if _, err := exec.LookPath(command + ext); err == nil {
					return command + ext, args, nil
				}
			}
		}
		return command, args, nil
	case "darwin", "linux":
		// Unix-like systems
		return command, args, nil
	default:
		return "", nil, fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}
}
