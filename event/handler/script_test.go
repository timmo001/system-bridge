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

func TestScriptExecuteHandler(t *testing.T) {
	// Create a temporary test script
	tmpDir := t.TempDir()
	scriptPath := filepath.Join(tmpDir, "test-script.sh")
	scriptContent := `#!/bin/bash
echo "Test output"
echo "Test error" >&2
exit 0
`
	err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
	require.NoError(t, err)

	// Set environment variable for config path
	t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tmpDir)

	// Reset viper state for clean test
	viper.Reset()

	// Load default settings first (this initializes viper)
	testSettings, err := settings.Load()
	require.NoError(t, err)

	// Set script allowlist
	testSettings.Scripts.Allowlist = []settings.SettingsScriptDefinition{
		{
			ID:         "test-script",
			Name:       "Test Script",
			Command:    scriptPath,
			WorkingDir: tmpDir,
			Arguments:  []string{},
		},
	}

	// Save test settings
	err = testSettings.Save()
	require.NoError(t, err)

	t.Run("Execute valid script", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterScriptExecuteHandler(router)

		msg := event.Message{
			ID:    "test-script-exec-1",
			Event: event.EventScriptExecute,
			Data: map[string]interface{}{
				"scriptID": "test-script",
			},
		}

		response := router.HandleMessage("test-conn-1", msg)

		assert.Equal(t, "test-script-exec-1", response.ID)
		assert.Equal(t, event.ResponseTypeScriptExecuting, response.Type)
		assert.Equal(t, event.ResponseSubtypeNone, response.Subtype)
		assert.Equal(t, "Script is executing", response.Message)

		// Verify response data contains scriptID
		data, ok := response.Data.(map[string]string)
		require.True(t, ok)
		assert.Equal(t, "test-script", data["scriptID"])

		// Wait a moment for async execution (in real test, we'd use a callback mechanism)
		time.Sleep(100 * time.Millisecond)
	})

	t.Run("Missing script ID", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterScriptExecuteHandler(router)

		msg := event.Message{
			ID:    "test-missing-id",
			Event: event.EventScriptExecute,
			Data:  map[string]interface{}{},
		}

		response := router.HandleMessage("test-conn-2", msg)

		assert.Equal(t, "test-missing-id", response.ID)
		assert.Equal(t, event.ResponseTypeError, response.Type)
		assert.Equal(t, event.ResponseSubtypeBadRequest, response.Subtype)
		assert.Equal(t, "Missing script ID", response.Message)
	})

	t.Run("Script not in allowlist", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterScriptExecuteHandler(router)

		msg := event.Message{
			ID:    "test-not-allowed",
			Event: event.EventScriptExecute,
			Data: map[string]interface{}{
				"scriptID": "nonexistent-script",
			},
		}

		response := router.HandleMessage("test-conn-3", msg)

		assert.Equal(t, "test-not-allowed", response.ID)
		assert.Equal(t, event.ResponseTypeError, response.Type)
		assert.Equal(t, event.ResponseSubtypeScriptNotFound, response.Subtype)
		assert.Contains(t, response.Message, "not found in allowlist")
	})

	t.Run("Invalid data format", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterScriptExecuteHandler(router)

		msg := event.Message{
			ID:    "test-invalid-data",
			Event: event.EventScriptExecute,
			Data:  "invalid string data",
		}

		response := router.HandleMessage("test-conn-4", msg)

		assert.Equal(t, "test-invalid-data", response.ID)
		assert.Equal(t, event.ResponseTypeError, response.Type)
		// Should get decode error or missing script ID
		assert.Contains(t, []event.ResponseSubtype{
			event.ResponseSubtypeNone,
			event.ResponseSubtypeBadRequest,
		}, response.Subtype)
	})

	t.Run("Handler registered correctly", func(t *testing.T) {
		router := event.NewMessageRouter()
		RegisterScriptExecuteHandler(router)

		assert.Contains(t, router.Handlers, event.EventScriptExecute)
	})
}

func TestScriptExecuteHandlerIntegration(t *testing.T) {
	t.Run("Complete script execution workflow", func(t *testing.T) {
		// Create a test script that outputs specific content
		tmpDir := t.TempDir()
		scriptPath := filepath.Join(tmpDir, "workflow-test.sh")
		scriptContent := `#!/bin/bash
echo "Hello from test script"
echo "Argument count: $#"
exit 0
`
		err := os.WriteFile(scriptPath, []byte(scriptContent), 0755)
		require.NoError(t, err)

		// Set environment variable for config path
		t.Setenv("SYSTEM_BRIDGE_CONFIG_DIR", tmpDir)

		// Reset viper state for clean test
		viper.Reset()

		// Load default settings first (this initializes viper)
		testSettings, err := settings.Load()
		require.NoError(t, err)

		// Set script allowlist
		testSettings.Scripts.Allowlist = []settings.SettingsScriptDefinition{
			{
				ID:         "workflow-script",
				Name:       "Workflow Test Script",
				Command:    scriptPath,
				WorkingDir: tmpDir,
				Arguments:  []string{"arg1", "arg2"},
			},
		}

		err = testSettings.Save()
		require.NoError(t, err)

		// Create router and register handler
		router := event.NewMessageRouter()
		RegisterScriptExecuteHandler(router)

		// Send execution request
		msg := event.Message{
			ID:    "workflow-test-1",
			Event: event.EventScriptExecute,
			Data: map[string]interface{}{
				"scriptID": "workflow-script",
			},
		}

		response := router.HandleMessage("workflow-conn", msg)

		// Verify immediate response
		assert.Equal(t, "workflow-test-1", response.ID)
		assert.Equal(t, event.ResponseTypeScriptExecuting, response.Type)
		assert.Equal(t, event.ResponseSubtypeNone, response.Subtype)
		assert.NotEmpty(t, response.Message)

		data, ok := response.Data.(map[string]string)
		require.True(t, ok)
		assert.Equal(t, "workflow-script", data["scriptID"])
	})
}

func TestScriptEventTypes(t *testing.T) {
	t.Run("Script event type constant", func(t *testing.T) {
		assert.Equal(t, event.EventType("SCRIPT_EXECUTE"), event.EventScriptExecute)
	})

	t.Run("Script response type constants", func(t *testing.T) {
		assert.Equal(t, event.ResponseType("SCRIPT_EXECUTING"), event.ResponseTypeScriptExecuting)
		assert.Equal(t, event.ResponseType("SCRIPT_COMPLETED"), event.ResponseTypeScriptCompleted)
	})

	t.Run("Script response subtype constant", func(t *testing.T) {
		assert.Equal(t, event.ResponseSubtype("SCRIPT_NOT_FOUND"), event.ResponseSubtypeScriptNotFound)
	})
}
