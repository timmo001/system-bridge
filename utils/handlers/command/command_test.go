package command

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/settings"
)

func TestValidateCommand(t *testing.T) {
	t.Run("Valid command in allowlist", func(t *testing.T) {
		// Create a temporary command file for testing
		tmpDir := t.TempDir()
		cmdPath := filepath.Join(tmpDir, "test-command")
		err := os.WriteFile(cmdPath, []byte("#!/bin/sh\necho test\n"), 0755)
		require.NoError(t, err)

		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:         "test-command",
						Name:       "Test Command",
						Command:    cmdPath,
						WorkingDir: tmpDir,
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
		assert.Equal(t, cmdPath, commandDef.Command)
		assert.Equal(t, tmpDir, commandDef.WorkingDir)
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
		assert.True(t, errors.Is(err, ErrCommandNotFound))
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
		assert.True(t, errors.Is(err, ErrCommandEmpty))
		assert.Contains(t, err.Error(), "has no command defined")
	})

	t.Run("Command with relative path", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:      "relative-command",
						Command: "bin/echo", // Relative path
					},
				},
			},
		}

		commandDef, err := ValidateCommand("relative-command", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.True(t, errors.Is(err, ErrCommandPathInvalid))
		assert.Contains(t, err.Error(), "must use absolute path")
	})

	t.Run("Command with non-existent path", func(t *testing.T) {
		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:      "missing-command",
						Command: "/nonexistent/path/command",
					},
				},
			},
		}

		commandDef, err := ValidateCommand("missing-command", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.True(t, errors.Is(err, ErrCommandPathInvalid))
		assert.Contains(t, err.Error(), "not found at path")
	})

	t.Run("Command with invalid working directory", func(t *testing.T) {
		tmpDir := t.TempDir()
		cmdPath := filepath.Join(tmpDir, "test-command")
		err := os.WriteFile(cmdPath, []byte("#!/bin/sh\necho test\n"), 0755)
		require.NoError(t, err)

		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:         "bad-working-dir",
						Command:    cmdPath,
						WorkingDir: "/nonexistent/directory",
					},
				},
			},
		}

		commandDef, err := ValidateCommand("bad-working-dir", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.True(t, errors.Is(err, ErrWorkingDirInvalid))
		assert.Contains(t, err.Error(), "does not exist")
	})

	t.Run("Command with relative working directory", func(t *testing.T) {
		tmpDir := t.TempDir()
		cmdPath := filepath.Join(tmpDir, "test-command")
		err := os.WriteFile(cmdPath, []byte("#!/bin/sh\necho test\n"), 0755)
		require.NoError(t, err)

		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:         "relative-working-dir",
						Command:    cmdPath,
						WorkingDir: "relative/path",
					},
				},
			},
		}

		commandDef, err := ValidateCommand("relative-working-dir", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.True(t, errors.Is(err, ErrWorkingDirInvalid))
		assert.Contains(t, err.Error(), "must be absolute path")
	})

	t.Run("Command with shell metacharacters in arguments", func(t *testing.T) {
		tmpDir := t.TempDir()
		cmdPath := filepath.Join(tmpDir, "test-command")
		err := os.WriteFile(cmdPath, []byte("#!/bin/sh\necho test\n"), 0755)
		require.NoError(t, err)

		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:        "shell-meta-command",
						Command:   cmdPath,
						Arguments: []string{"arg1; rm -rf /"},
					},
				},
			},
		}

		commandDef, err := ValidateCommand("shell-meta-command", cfg)

		assert.Error(t, err)
		assert.Nil(t, commandDef)
		assert.Contains(t, err.Error(), "forbidden characters")
	})

	t.Run("Multiple commands in allowlist", func(t *testing.T) {
		// Create temporary command files
		tmpDir := t.TempDir()
		cmd1Path := filepath.Join(tmpDir, "cmd1")
		cmd2Path := filepath.Join(tmpDir, "cmd2")
		cmd3Path := filepath.Join(tmpDir, "cmd3")
		for _, path := range []string{cmd1Path, cmd2Path, cmd3Path} {
			err := os.WriteFile(path, []byte("#!/bin/sh\necho test\n"), 0755)
			require.NoError(t, err)
		}

		cfg := &settings.Settings{
			Commands: settings.SettingsCommands{
				Allowlist: []settings.SettingsCommandDefinition{
					{
						ID:      "command1",
						Command: cmd1Path,
					},
					{
						ID:      "command2",
						Command: cmd2Path,
					},
					{
						ID:      "command3",
						Command: cmd3Path,
					},
				},
			},
		}

		commandDef, err := ValidateCommand("command2", cfg)

		require.NoError(t, err)
		assert.NotNil(t, commandDef)
		assert.Equal(t, "command2", commandDef.ID)
		assert.Equal(t, cmd2Path, commandDef.Command)
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
		assert.True(t, errors.Is(err, ErrCommandNotFound))
		assert.Contains(t, err.Error(), "not found in allowlist")
	})
}

func TestExecuteWithContext(t *testing.T) {
	t.Run("Command timeout", func(t *testing.T) {
		tmpDir := t.TempDir()
		cmdPath := filepath.Join(tmpDir, "sleep-command")
		// Create a script that sleeps for longer than the test timeout
		script := "#!/bin/sh\nsleep 10\necho done\n"
		err := os.WriteFile(cmdPath, []byte(script), 0755)
		require.NoError(t, err)

		commandDef := &settings.SettingsCommandDefinition{
			ID:        "sleep-command",
			Name:      "Sleep Command",
			Command:   cmdPath,
			Arguments: []string{},
		}

		// Create context with short timeout
		ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
		defer cancel()

		result := execute(ctx, commandDef)

		assert.Equal(t, "sleep-command", result.CommandID)
		assert.Equal(t, -1, result.ExitCode)
		assert.Contains(t, result.Error, "timeout")
	})

	t.Run("Command with output limits", func(t *testing.T) {
		tmpDir := t.TempDir()
		cmdPath := filepath.Join(tmpDir, "large-output-command")
		// Create a script that outputs more than MaxOutputSize
		script := "#!/bin/sh\nfor i in $(seq 1 20000); do echo 'This is line ' $i; done\n"
		err := os.WriteFile(cmdPath, []byte(script), 0755)
		require.NoError(t, err)

		commandDef := &settings.SettingsCommandDefinition{
			ID:        "large-output-command",
			Name:      "Large Output Command",
			Command:   cmdPath,
			Arguments: []string{},
		}

		ctx := context.Background()
		result := execute(ctx, commandDef)

		assert.Equal(t, "large-output-command", result.CommandID)
		// Output should be truncated
		assert.LessOrEqual(t, len(result.Stdout), MaxOutputSize+100) // Allow for truncation message
		assert.True(t, strings.Contains(result.Stdout, "(output truncated)") || len(result.Stdout) <= MaxOutputSize)
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
