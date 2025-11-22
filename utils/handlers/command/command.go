package command

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/timmo001/system-bridge/backend/websocket"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
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

// ValidateCommand validates that the command exists in the allowlist
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
				return nil, fmt.Errorf("command %s has no command defined", commandID)
			}
			return command, nil
		}
	}

	return nil, fmt.Errorf("command %s not found in allowlist", commandID)
}

// Execute validates and executes a command asynchronously
func Execute(req ExecuteRequest, cfg *settings.Settings) error {
	// Validate command
	commandDef, err := ValidateCommand(req.CommandID, cfg)
	if err != nil {
		return err
	}

	slog.Info(
		"Executing command",
		"commandID", commandDef.ID,
		"name", commandDef.Name,
		"command", commandDef.Command,
	)

	// Execute asynchronously
	go executeAsync(req, commandDef)

	return nil
}

// executeAsync runs the command and sends the result via WebSocket
func executeAsync(req ExecuteRequest, commandDef *settings.SettingsCommandDefinition) {
	// Execute the command (OS-specific implementation)
	result := execute(commandDef)
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

	// Log result
	if result.Error != "" {
		slog.Error(
			"Command execution failed",
			"commandID", result.CommandID,
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
		maxLogLength := 200

		if len(stdout) > maxLogLength {
			stdout = stdout[:maxLogLength] + "... (truncated)"
		}
		if len(stderr) > maxLogLength {
			stderr = stderr[:maxLogLength] + "... (truncated)"
		}

		slog.Log(
			context.Background(),
			logLevel,
			"Command execution completed",
			"commandID", result.CommandID,
			"exitCode", result.ExitCode,
			"stdout", strings.TrimSpace(stdout),
			"stderr", strings.TrimSpace(stderr),
		)
	}
}
