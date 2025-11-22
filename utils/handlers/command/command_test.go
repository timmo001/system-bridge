package command

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/settings"
)

func TestValidateCommand(t *testing.T) {
	t.Run("Valid command in allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:         "test-command",
						Name:       "Test Command",
						Command:    "/bin/echo",
						WorkingDir: "/tmp",
						Arguments:  []string{"hello", "world"},
					},
				},
			},
		}

		commandDef, err := ValidateCommand("test-command", cfg)

		require.NoError(t, err)
		assert.NotNil(t, commandDef)
		assert.Equal(t, "test-command", commandDef.ID)
		assert.Equal(t, "Test Command", commandDef.Name)
		assert.Equal(t, "/bin/echo", commandDef.Command)
		assert.Equal(t, "/tmp", commandDef.WorkingDir)
		assert.Equal(t, []string{"hello", "world"}, commandDef.Arguments)
	})

	t.Run("Command not in allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:      "allowed-command",
						Command: "/bin/echo",
					},
				},
			},
		}

		commandDef, err := ValidateCommand("nonexistent-command", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.Contains(t, err.Error(), "not found in allowlist")
	})

	t.Run("Empty command ID", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{},
			},
		}

		commandDef, err := ValidateCommand("", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.Equal(t, "command ID is required", err.Error())
	})

	t.Run("Command with empty command", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:      "bad-command",
						Command: "", // Empty command
					},
				},
			},
		}

		commandDef, err := ValidateCommand("bad-command", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.Contains(t, err.Error(), "has no command defined")
	})

	t.Run("Multiple commands in allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:      "command1",
						Command: "/bin/echo",
					},
					{
						ID:      "command2",
						Command: "/bin/ls",
					},
					{
						ID:      "command3",
						Command: "/bin/pwd",
					},
				},
			},
		}

		commandDef, err := ValidateCommand("command2", cfg)

		require.NoError(t, err)
		assert.NotNil(t, commandDef)
		assert.Equal(t, "command2", commandDef.ID)
		assert.Equal(t, "/bin/ls", commandDef.Command)
	})

	t.Run("Empty allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{},
			},
		}

		commandDef, err := ValidateCommand("any-command", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.Contains(t, err.Error(), "not found in allowlist")
	})
}

func TestExecuteRequest(t *testing.T) {
	t.Run("Create execute request", func(t *testing.T) {
		req := ExecuteRequest{
			CommandID:  "test-command",
			RequestID:  "req-123",
			Connection: "192.168.1.100:12345",
		}

		assert.Equal(t, "test-command", req.CommandID)
		assert.Equal(t, "req-123", req.RequestID)
		assert.Equal(t, "192.168.1.100:12345", req.Connection)
	})
}

func TestExecuteResult(t *testing.T) {
	t.Run("Create execute result", func(t *testing.T) {
		result := ExecuteResult{
			CommandID: "test-command",
			ExitCode:  0,
			Stdout:    "Command output",
			Stderr:    "",
			Error:     "",
		}

		assert.Equal(t, "test-command", result.CommandID)
		assert.Equal(t, 0, result.ExitCode)
		assert.Equal(t, "Command output", result.Stdout)
		assert.Empty(t, result.Stderr)
		assert.Empty(t, result.Error)
	})

	t.Run("Create error result", func(t *testing.T) {
		result := ExecuteResult{
			CommandID: "failing-command",
			ExitCode:  1,
			Stdout:    "",
			Stderr:    "Error message",
			Error:     "execution failed",
		}

		assert.Equal(t, "failing-command", result.CommandID)
		assert.Equal(t, 1, result.ExitCode)
		assert.Empty(t, result.Stdout)
		assert.Equal(t, "Error message", result.Stderr)
		assert.Equal(t, "execution failed", result.Error)
	})
}
