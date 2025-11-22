package event_handler

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

func TestCommandExecuteHandler(t *testing.T) {
	// Create a temporary test command
	tmpDir := t.TempDir()
	commandPath := filepath.Join(tmpDir, "test-command.sh")
	commandContent := `#!/bin/bash
echo "Test output"
echo "Test error" >&2
exit 0
`
	err := os.WriteFile(commandPath, []byte(commandContent), 0755)
	require.NoError(t, err)

	// Set environment variable for config path
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tmpDir)

	// Reset viper state for clean test
	viper.Reset()

	// Load default settings first (this initializes viper)
	testSettings, err := settings.Load()
	require.NoError(t, err)

	// Set command allowlist
	testSettings.Commands.Allowlist = []settings.SettingsCommandDefinition{
		{
			ID:         "test-command",
			Name:       "Test Command",
			Command:    commandPath,
			WorkingDir: tmpDir,
			Arguments:  []string{},
		},
	}

	// Save test settings
	err = testSettings.Save()
	require.NoError(t, err)

	t.Run("Execute valid command", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterCommandExecuteHandler(router)

		msg := event.Message{
			ID:    "test-command-exec-1",
			Event: event.EventCommandExecute,
			Data: map[string]interface{}{
				"commandID": "test-command",
			},
		}

		response := router.HandleMessage("test-conn-1", msg)

		assert.Equal(t, "test-command-exec-1", response.ID)
		assert.Equal(t, event.ResponseTypeCommandExecuting, response.Type)
		assert.Equal(t, event.ResponseSubtypeNone, response.Subtype)
		assert.Equal(t, "Command is executing", response.Message)

		// Verify response data contains commandID
		data, ok := response.Data.(map[string]string)
		require.True(t, ok)
		assert.Equal(t, "test-command", data["commandID"])

		// Wait a moment for async execution (in real test, we'd use a callback mechanism)
		time.Sleep(100 * time.Millisecond)
	})

	t.Run("Missing command ID", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterCommandExecuteHandler(router)

		msg := event.Message{
			ID:    "test-missing-id",
			Event: event.EventCommandExecute,
			Data:  map[string]interface{}{},
		}

		response := router.HandleMessage("test-conn-2", msg)

		assert.Equal(t, "test-missing-id", response.ID)
		assert.Equal(t, event.ResponseTypeError, response.Type)
		assert.Equal(t, event.ResponseSubtypeBadRequest, response.Subtype)
		assert.Equal(t, "Missing command ID", response.Message)
	})

	t.Run("Command not in allowlist", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterCommandExecuteHandler(router)

		msg := event.Message{
			ID:    "test-not-allowed",
			Event: event.EventCommandExecute,
			Data: map[string]interface{}{
				"commandID": "nonexistent-command",
			},
		}

		response := router.HandleMessage("test-conn-3", msg)

		assert.Equal(t, "test-not-allowed", response.ID)
		assert.Equal(t, event.ResponseTypeError, response.Type)
		assert.Equal(t, event.ResponseSubtypeCommandNotFound, response.Subtype)
		assert.Contains(t, response.Message, "not found in allowlist")
	})

	t.Run("Invalid data format", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterCommandExecuteHandler(router)

		msg := event.Message{
			ID:    "test-invalid-data",
			Event: event.EventCommandExecute,
			Data:  "invalid string data",
		}

		response := router.HandleMessage("test-conn-4", msg)

		assert.Equal(t, "test-invalid-data", response.ID)
		assert.Equal(t, event.ResponseTypeError, response.Type)
		// Should get decode error or missing command ID
		assert.Contains(t, []event.ResponseSubtype{
			event.ResponseSubtypeNone,
			event.ResponseSubtypeBadRequest,
		}, response.Subtype)
	})

	t.Run("Handler registered correctly", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterCommandExecuteHandler(router)

		assert.Contains(t, router.Handlers, event.EventCommandExecute)
	})
}

func TestCommandExecuteHandlerIntegration(t *testing.T) {
	t.Run("Complete command execution workflow", func(t *testing.T) {
		// Create a test command that outputs specific content
		tmpDir := t.TempDir()
		commandPath := filepath.Join(tmpDir, "workflow-test.sh")
		commandContent := `#!/bin/bash
echo "Hello from test command"
echo "Argument count: $#"
exit 0
`
		err := os.WriteFile(commandPath, []byte(commandContent), 0755)
		require.NoError(t, err)

		// Set environment variable for config path
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tmpDir)

		// Reset viper state for clean test
		viper.Reset()

		// Load default settings first (this initializes viper)
		testSettings, err := settings.Load()
		require.NoError(t, err)

		// Set command allowlist
		testSettings.Commands.Allowlist = []settings.SettingsCommandDefinition{
			{
				ID:         "workflow-command",
				Name:       "Workflow Test Command",
				Command:    commandPath,
				WorkingDir: tmpDir,
				Arguments:  []string{"arg1", "arg2"},
			},
		}

		err = testSettings.Save()
		require.NoError(t, err)

		// Create router and register handler
		router := event.NewMessageRouter()
		RegisterCommandExecuteHandler(router)

		// Send execution request
		msg := event.Message{
			ID:    "workflow-test-1",
			Event: event.EventCommandExecute,
			Data: map[string]interface{}{
				"commandID": "workflow-command",
			},
		}

		response := router.HandleMessage("workflow-conn", msg)

		// Verify immediate response
		assert.Equal(t, "workflow-test-1", response.ID)
		assert.Equal(t, event.ResponseTypeCommandExecuting, response.Type)
		assert.Equal(t, event.ResponseSubtypeNone, response.Subtype)
		assert.NotEmpty(t, response.Message)

		data, ok := response.Data.(map[string]string)
		require.True(t, ok)
		assert.Equal(t, "workflow-command", data["commandID"])
	})
}

func TestCommandEventTypes(t *testing.T) {
	t.Run("Command event type constant", func(t *testing.T) {
		assert.Equal(t, event.EventType("COMMAND_EXECUTE"), event.EventCommandExecute)
	})

	t.Run("Command response type constants", func(t *testing.T) {
		assert.Equal(t, event.ResponseType("COMMAND_EXECUTING"), event.ResponseTypeCommandExecuting)
		assert.Equal(t, event.ResponseType("COMMAND_COMPLETED"), event.ResponseTypeCommandCompleted)
	})

	t.Run("Command response subtype constant", func(t *testing.T) {
		assert.Equal(t, event.ResponseSubtype("COMMAND_NOT_FOUND"), event.ResponseSubtypeCommandNotFound)
	})
}
