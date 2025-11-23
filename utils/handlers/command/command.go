package command

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/utils"
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

			// Use centralized validation from utils package
			// This ensures consistent validation logic and includes path traversal checks
			err := utils.ValidateCommand(command.ID, command.Name, command.Command, command.WorkingDir, command.Arguments)
			if err != nil {
				// Wrap error with appropriate error type based on error message
				errMsg := err.Error()
				switch {
				case strings.Contains(errMsg, "working directory"):
					return nil, fmt.Errorf("%w: %w", ErrWorkingDirInvalid, err)
				case strings.Contains(errMsg, "path") || strings.Contains(errMsg, "executable"):
					return nil, fmt.Errorf("%w: %w", ErrCommandPathInvalid, err)
				default:
					return nil, err
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

	// Verify connection still exists before spawning goroutine
	// This prevents orphaned command execution when connection closes between validation and execution
	ws := websocket.GetInstance()
	if ws == nil {
		return errors.New("WebSocket instance not available")
	}
	if !ws.ConnectionExists(req.Connection) {
		slog.Warn(
			"Command execution aborted - connection no longer exists",
			"commandID", commandDef.ID,
			"connection", req.Connection,
			"requestID", req.RequestID,
		)
		return errors.New("connection no longer exists")
	}

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
