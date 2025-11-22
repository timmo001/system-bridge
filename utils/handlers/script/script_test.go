package script

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/settings"
)

func TestValidateScript(t *testing.T) {
	t.Run("Valid script in allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Scripts: settings.SettingsScripts{
				Allowlist: []settings.SettingsScriptDefinition{
					{
						ID:         "test-script",
						Name:       "Test Script",
						Command:    "/bin/echo",
						WorkingDir: "/tmp",
						Arguments:  []string{"hello", "world"},
					},
				},
			},
		}

		scriptDef, err := ValidateScript("test-script", cfg)

		require.NoError(t, err)
		assert.NotNil(t, scriptDef)
		assert.Equal(t, "test-script", scriptDef.ID)
		assert.Equal(t, "Test Script", scriptDef.Name)
		assert.Equal(t, "/bin/echo", scriptDef.Command)
		assert.Equal(t, "/tmp", scriptDef.WorkingDir)
		assert.Equal(t, []string{"hello", "world"}, scriptDef.Arguments)
	})

	t.Run("Script not in allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Scripts: settings.SettingsScripts{
				Allowlist: []settings.SettingsScriptDefinition{
					{
						ID:      "allowed-script",
						Command: "/bin/echo",
					},
				},
			},
		}

		scriptDef, err := ValidateScript("nonexistent-script", cfg)

		assert.Error(t, err)
		assert.Nil(t, scriptDef)
		assert.Contains(t, err.Error(), "not found in allowlist")
	})

	t.Run("Empty script ID", func(t *testing.T) {
		cfg := &settings.Settings{
			Scripts: settings.SettingsScripts{
				Allowlist: []settings.SettingsScriptDefinition{},
			},
		}

		scriptDef, err := ValidateScript("", cfg)

		assert.Error(t, err)
		assert.Nil(t, scriptDef)
		assert.Equal(t, "script ID is required", err.Error())
	})

	t.Run("Script with empty command", func(t *testing.T) {
		cfg := &settings.Settings{
			Scripts: settings.SettingsScripts{
				Allowlist: []settings.SettingsScriptDefinition{
					{
						ID:      "bad-script",
						Command: "", // Empty command
					},
				},
			},
		}

		scriptDef, err := ValidateScript("bad-script", cfg)

		assert.Error(t, err)
		assert.Nil(t, scriptDef)
		assert.Contains(t, err.Error(), "has no command defined")
	})

	t.Run("Multiple scripts in allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Scripts: settings.SettingsScripts{
				Allowlist: []settings.SettingsScriptDefinition{
					{
						ID:      "script1",
						Command: "/bin/echo",
					},
					{
						ID:      "script2",
						Command: "/bin/ls",
					},
					{
						ID:      "script3",
						Command: "/bin/pwd",
					},
				},
			},
		}

		scriptDef, err := ValidateScript("script2", cfg)

		require.NoError(t, err)
		assert.NotNil(t, scriptDef)
		assert.Equal(t, "script2", scriptDef.ID)
		assert.Equal(t, "/bin/ls", scriptDef.Command)
	})

	t.Run("Empty allowlist", func(t *testing.T) {
		cfg := &settings.Settings{
			Scripts: settings.SettingsScripts{
				Allowlist: []settings.SettingsScriptDefinition{},
			},
		}

		scriptDef, err := ValidateScript("any-script", cfg)

		assert.Error(t, err)
		assert.Nil(t, scriptDef)
		assert.Contains(t, err.Error(), "not found in allowlist")
	})
}

func TestExecuteRequest(t *testing.T) {
	t.Run("Create execute request", func(t *testing.T) {
		req := ExecuteRequest{
			ScriptID:   "test-script",
			RequestID:  "req-123",
			Connection: "192.168.1.100:12345",
		}

		assert.Equal(t, "test-script", req.ScriptID)
		assert.Equal(t, "req-123", req.RequestID)
		assert.Equal(t, "192.168.1.100:12345", req.Connection)
	})
}

func TestExecuteResult(t *testing.T) {
	t.Run("Create execute result", func(t *testing.T) {
		result := ExecuteResult{
			ScriptID: "test-script",
			ExitCode: 0,
			Stdout:   "Script output",
			Stderr:   "",
			Error:    "",
		}

		assert.Equal(t, "test-script", result.ScriptID)
		assert.Equal(t, 0, result.ExitCode)
		assert.Equal(t, "Script output", result.Stdout)
		assert.Empty(t, result.Stderr)
		assert.Empty(t, result.Error)
	})

	t.Run("Create error result", func(t *testing.T) {
		result := ExecuteResult{
			ScriptID: "failing-script",
			ExitCode: 1,
			Stdout:   "",
			Stderr:   "Error message",
			Error:    "execution failed",
		}

		assert.Equal(t, "failing-script", result.ScriptID)
		assert.Equal(t, 1, result.ExitCode)
		assert.Empty(t, result.Stdout)
		assert.Equal(t, "Error message", result.Stderr)
		assert.Equal(t, "execution failed", result.Error)
	})
}
