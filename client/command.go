package client

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
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

// AddCommand adds a command to the allowlist with COMMAND_ADD, giving it a new
// id when it has none, and returns it as saved
func AddCommand(ctx context.Context, command settings.SettingsCommandDefinition) (settings.SettingsCommandDefinition, error) {
	if command.ID == "" {
		command.ID = uuid.NewString()
	}
	if command.Arguments == nil {
		command.Arguments = []string{}
	}
	if err := Send(ctx, event.EventCommandAdd, command); err != nil {
		return settings.SettingsCommandDefinition{}, err
	}
	return command, nil
}

// UpdateCommand replaces a command on the allowlist, matched by its id, with
// COMMAND_UPDATE
func UpdateCommand(ctx context.Context, command settings.SettingsCommandDefinition) (settings.SettingsCommandDefinition, error) {
	if command.Arguments == nil {
		command.Arguments = []string{}
	}
	if err := Send(ctx, event.EventCommandUpdate, command); err != nil {
		return settings.SettingsCommandDefinition{}, err
	}
	return command, nil
}

// RemoveCommand takes a command off the allowlist with COMMAND_REMOVE. The
// backend succeeds for an id that isn't there.
func RemoveCommand(ctx context.Context, id string) error {
	return Send(ctx, event.EventCommandRemove, map[string]any{"id": id})
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
