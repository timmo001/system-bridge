package script

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

// ExecuteRequest contains the data for a script execution request
type ExecuteRequest struct {
	ScriptID   string `json:"scriptID" mapstructure:"scriptID"`
	RequestID  string `json:"-"`
	Connection string `json:"-"`
}

// ExecuteResult contains the result of a script execution
type ExecuteResult struct {
	ScriptID string `json:"scriptID" mapstructure:"scriptID"`
	ExitCode int    `json:"exitCode" mapstructure:"exitCode"`
	Stdout   string `json:"stdout" mapstructure:"stdout"`
	Stderr   string `json:"stderr" mapstructure:"stderr"`
	Error    string `json:"error,omitempty" mapstructure:"error,omitempty"`
}

// ValidateScript validates that the script exists in the allowlist
func ValidateScript(scriptID string, cfg *settings.Settings) (*settings.SettingsScriptDefinition, error) {
	if scriptID == "" {
		return nil, errors.New("script ID is required")
	}

	// Search for script in allowlist
	for i := range cfg.Scripts.Allowlist {
		script := &cfg.Scripts.Allowlist[i]
		if script.ID == scriptID {
			// Validate required fields
			if script.Command == "" {
				return nil, fmt.Errorf("script %s has no command defined", scriptID)
			}
			return script, nil
		}
	}

	return nil, fmt.Errorf("script %s not found in allowlist", scriptID)
}

// Execute validates and executes a script asynchronously
func Execute(req ExecuteRequest, cfg *settings.Settings) error {
	// Validate script
	scriptDef, err := ValidateScript(req.ScriptID, cfg)
	if err != nil {
		return err
	}

	slog.Info(
		"Executing script",
		"scriptID", scriptDef.ID,
		"name", scriptDef.Name,
		"command", scriptDef.Command,
	)

	// Execute asynchronously
	go executeAsync(req, scriptDef)

	return nil
}

// executeAsync runs the script and sends the result via WebSocket
func executeAsync(req ExecuteRequest, scriptDef *settings.SettingsScriptDefinition) {
	// Execute the script (OS-specific implementation)
	result := execute(scriptDef)
	result.ScriptID = scriptDef.ID

	// Get WebSocket instance to send callback
	ws := websocket.GetInstance()
	if ws == nil {
		slog.Error("WebSocket instance not available for script callback")
		return
	}

	// Prepare response message
	responseType := event.ResponseTypeScriptCompleted
	responseSubtype := event.ResponseSubtypeNone
	message := "Script executed successfully"

	if result.Error != "" {
		message = result.Error
	} else if result.ExitCode != 0 {
		message = fmt.Sprintf("Script exited with code %d", result.ExitCode)
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
		slog.Error("Failed to send script completion callback", "connection", req.Connection)
		return
	}

	// Log result
	if result.Error != "" {
		slog.Error(
			"Script execution failed",
			"scriptID", result.ScriptID,
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
			"Script execution completed",
			"scriptID", result.ScriptID,
			"exitCode", result.ExitCode,
			"stdout", strings.TrimSpace(stdout),
			"stderr", strings.TrimSpace(stderr),
		)
	}
}
