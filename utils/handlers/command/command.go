package command

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

const (
	// MaxOutputSize is the maximum size of stdout/stderr output (1MB)
	MaxOutputSize = 1 * 1024 * 1024
	// DefaultCommandTimeout is the default timeout for command execution (5 minutes)
	DefaultCommandTimeout = 5 * time.Minute
	// MaxLogOutputLength is the maximum length for log output truncation
	MaxLogOutputLength = 200
)

var (
	// ErrCommandNotFound is returned when a command is not found in the allowlist
	ErrCommandNotFound = errors.New("command not found in allowlist")
	// ErrCommandEmpty is returned when a command has no command defined
	ErrCommandEmpty = errors.New("command has no command defined")
	// ErrCommandPathInvalid is returned when a command path is invalid
	ErrCommandPathInvalid = errors.New("command path is invalid")
	// ErrWorkingDirInvalid is returned when a working directory is invalid
	ErrWorkingDirInvalid = errors.New("working directory is invalid")
)

// ExecuteRequest contains the data for a command execution request
type ExecuteRequest struct {
	CommandID  string `json:"commandID" mapstructure:"commandID"`
	RequestID  string `json:"-"`
	Connection string `json:"-"`
}

// ExecuteResult contains the result of a command execution
type ExecuteResult struct {
	CommandID string `json:"commandID" mapstructure:"commandID"`
	ExitCode  int    `json:"exitCode" mapstructure:"exitCode"`
	Stdout    string `json:"stdout" mapstructure:"stdout"`
	Stderr    string `json:"stderr" mapstructure:"stderr"`
	Error     string `json:"error,omitempty" mapstructure:"error,omitempty"`
}

// ValidateCommand validates that the command exists in the allowlist and has valid paths
func ValidateCommand(commandID string, cfg *settings.Settings) (*settings.SettingsCommandDefinition, error) {
	if commandID == "" {
		return nil, errors.New("command ID is required")
	}

	// Search for command in allowlist
	for i := range cfg.Commands.Allowlist {
		command := &cfg.Commands.Allowlist[i]
		if command.ID == commandID {
			// Validate required fields
			if command.Command == "" {
				return nil, fmt.Errorf("%w: %s", ErrCommandEmpty, commandID)
			}

			// Validate command path is absolute
			if !filepath.IsAbs(command.Command) {
				return nil, fmt.Errorf("%w: command %s must use absolute path", ErrCommandPathInvalid, commandID)
			}

			// Validate command file exists and is executable (on Unix systems)
			fileInfo, err := os.Stat(command.Command)
			if err != nil {
				if os.IsNotExist(err) {
					return nil, fmt.Errorf("%w: command %s not found at path: %s", ErrCommandPathInvalid, commandID, command.Command)
				}
				return nil, fmt.Errorf("%w: command %s path error: %w", ErrCommandPathInvalid, commandID, err)
			}
			// Check if file is executable on Unix-like systems (Linux, macOS, etc.)
			// On Windows, this check is skipped as executable permission is determined by file extension
			mode := fileInfo.Mode()
			if !mode.IsRegular() {
				return nil, fmt.Errorf("%w: command %s is not a regular file", ErrCommandPathInvalid, commandID)
			}
			// Check executable bit (0111 = owner, group, others execute permissions)
			// This check applies to Unix-like systems; Windows will pass this check
			if mode&0111 == 0 {
				return nil, fmt.Errorf("%w: command %s is not executable (missing execute permissions)", ErrCommandPathInvalid, commandID)
			}

			// Validate working directory if specified
			if command.WorkingDir != "" {
				if !filepath.IsAbs(command.WorkingDir) {
					return nil, fmt.Errorf("%w: working directory for command %s must be absolute path", ErrWorkingDirInvalid, commandID)
				}
				info, err := os.Stat(command.WorkingDir)
				if err != nil {
					if os.IsNotExist(err) {
						return nil, fmt.Errorf("%w: working directory for command %s does not exist: %s", ErrWorkingDirInvalid, commandID, command.WorkingDir)
					}
					return nil, fmt.Errorf("%w: working directory for command %s: %w", ErrWorkingDirInvalid, commandID, err)
				}
				if !info.IsDir() {
					return nil, fmt.Errorf("%w: working directory for command %s is not a directory: %s", ErrWorkingDirInvalid, commandID, command.WorkingDir)
				}
			}

			// Validate arguments don't contain shell metacharacters
			// Check for: ; | & $ \n \r ` < > ( )
			for _, arg := range command.Arguments {
				if strings.ContainsAny(arg, ";|&$\n\r`<>()") {
					return nil, fmt.Errorf("argument for command %s contains forbidden characters (shell metacharacters not allowed)", commandID)
				}
			}

			return command, nil
		}
	}

	return nil, fmt.Errorf("%w: %s", ErrCommandNotFound, commandID)
}

// Execute validates and executes a command asynchronously
func Execute(req ExecuteRequest, cfg *settings.Settings) error {
	// Validate command
	commandDef, err := ValidateCommand(req.CommandID, cfg)
	if err != nil {
		// Log unauthorized attempts at higher severity
		slog.Warn(
			"Command execution denied",
			"commandID", req.CommandID,
			"connection", req.Connection,
			"requestID", req.RequestID,
			"error", err.Error(),
		)
		return err
	}

	// Comprehensive audit logging with connection ID, request ID, timestamp, and full arguments
	slog.Info(
		"Executing command",
		"commandID", commandDef.ID,
		"name", commandDef.Name,
		"command", commandDef.Command,
		"arguments", commandDef.Arguments,
		"workingDir", commandDef.WorkingDir,
		"connection", req.Connection,
		"requestID", req.RequestID,
	)

	// Execute asynchronously
	go executeAsync(req, commandDef)

	return nil
}

// executeAsync runs the command and sends the result via WebSocket
func executeAsync(req ExecuteRequest, commandDef *settings.SettingsCommandDefinition) {
	// Create a context with timeout for command execution
	ctx, cancel := context.WithTimeout(context.Background(), DefaultCommandTimeout)

	// Ensure cleanup on completion
	defer cancel()

	// Execute the command with context
	result := execute(ctx, commandDef)
	result.CommandID = commandDef.ID

	// Get WebSocket instance to send callback
	ws := websocket.GetInstance()
	if ws == nil {
		slog.Error("WebSocket instance not available for command callback")
		return
	}

	// Prepare response message
	responseType := event.ResponseTypeCommandCompleted
	responseSubtype := event.ResponseSubtypeNone
	message := "Command executed successfully"

	if result.Error != "" {
		message = result.Error
	} else if result.ExitCode != 0 {
		message = fmt.Sprintf("Command exited with code %d", result.ExitCode)
	}

	// Send callback via WebSocket
	response := event.MessageResponse{
		ID:      req.RequestID,
		Type:    responseType,
		Subtype: responseSubtype,
		Data:    result,
		Message: message,
	}

	// Send message to the connection that initiated the request
	if !ws.SendMessageToAddress(req.Connection, response) {
		slog.Error("Failed to send command completion callback", "connection", req.Connection)
		return
	}

	// Log result with comprehensive audit information
	if result.Error != "" {
		slog.Error(
			"Command execution failed",
			"commandID", result.CommandID,
			"connection", req.Connection,
			"requestID", req.RequestID,
			"error", result.Error,
		)
	} else {
		logLevel := slog.LevelInfo
		if result.ExitCode != 0 {
			logLevel = slog.LevelWarn
		}

		// Truncate output for logging if too long
		stdout := result.Stdout
		stderr := result.Stderr

		if len(stdout) > MaxLogOutputLength {
			stdout = stdout[:MaxLogOutputLength] + "... (truncated)"
		}
		if len(stderr) > MaxLogOutputLength {
			stderr = stderr[:MaxLogOutputLength] + "... (truncated)"
		}

		slog.Log(
			context.Background(),
			logLevel,
			"Command execution completed",
			"commandID", result.CommandID,
			"exitCode", result.ExitCode,
			"connection", req.Connection,
			"requestID", req.RequestID,
			"stdout", strings.TrimSpace(stdout),
			"stderr", strings.TrimSpace(stderr),
		)
	}
}
