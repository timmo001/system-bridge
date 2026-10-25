package client

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
)

// commandRunTimeout waits as long as the backend lets a command run, with time
// for it to report back
const commandRunTimeout = 5*time.Minute + 15*time.Second

// CommandResult is how an allowlisted command finished
type CommandResult struct {
	CommandID string `json:"commandID"`
	ExitCode  int    `json:"exitCode"`
	Stdout    string `json:"stdout"`
	Stderr    string `json:"stderr"`
	Error     string `json:"error,omitempty"`
}

// Commands lists the commands on the allowlist
func Commands(ctx context.Context) ([]settings.SettingsCommandDefinition, error) {
	raw, err := request(ctx, sendTimeout, event.EventGetSettings, map[string]any{})
	if err != nil {
		return nil, err
	}

	var current struct {
		Commands settings.SettingsCommands `json:"commands"`
	}
	if err := json.Unmarshal(raw, &current); err != nil {
		return nil, fmt.Errorf("decode settings: %w", err)
	}
	if current.Commands.Allowlist == nil {
		return []settings.SettingsCommandDefinition{}, nil
	}
	return current.Commands.Allowlist, nil
}

// CommandPrefabs lists the ready-made commands, and whether each can run on
// this system
func CommandPrefabs(ctx context.Context) ([]types.CommandPrefab, error) {
	raw, err := request(ctx, sendTimeout, event.EventGetCommandPrefabs, map[string]any{})
	if err != nil {
		return nil, err
	}

	var prefabs []types.CommandPrefab
	if err := json.Unmarshal(raw, &prefabs); err != nil {
		return nil, fmt.Errorf("decode command prefabs: %w", err)
	}
	return prefabs, nil
}

// RunCommand runs an allowlisted command and waits for it to finish
func RunCommand(ctx context.Context, id string) (CommandResult, error) {
	raw, err := requestReply(ctx, commandRunTimeout, event.EventCommandExecute,
		map[string]any{"commandID": id}, event.ResponseTypeCommandCompleted)
	if err != nil {
		return CommandResult{}, err
	}

	var result CommandResult
	if err := json.Unmarshal(raw, &result); err != nil {
		return CommandResult{}, fmt.Errorf("decode command result: %w", err)
	}
	return result, nil
}
