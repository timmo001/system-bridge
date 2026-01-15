package mcp

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
)

func TestHandleGetData(t *testing.T) {
	// Create test server
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)

	eventRouter := event.NewMessageRouter()
	server := NewMCPServer("test-token", eventRouter, dataStore)

	// Test with valid module
	arguments := map[string]interface{}{
		"modules": []interface{}{"cpu", "memory"},
	}

	result, err := server.handleGetData(context.Background(), arguments)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	resultMap, ok := result.(map[string]interface{})
	assert.True(t, ok)
	assert.Contains(t, resultMap, "cpu")
	assert.Contains(t, resultMap, "memory")
}

func TestHandleGetDataInvalidParams(t *testing.T) {
	// Create test server
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)

	eventRouter := event.NewMessageRouter()
	server := NewMCPServer("test-token", eventRouter, dataStore)

	// Test with missing modules
	arguments := map[string]interface{}{}

	_, err = server.handleGetData(context.Background(), arguments)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing required parameter: modules")
}

func TestFormatToolResult(t *testing.T) {
	result := map[string]interface{}{
		"success": true,
		"data":    "test data",
	}

	toolResult := formatToolResult(result)
	assert.Len(t, toolResult.Content, 1)
	assert.Equal(t, "text", toolResult.Content[0].Type)
	assert.Contains(t, toolResult.Content[0].Text, "success")
	assert.Contains(t, toolResult.Content[0].Text, "test data")
}

func TestExecuteToolUnknown(t *testing.T) {
	// Create test server
	dataStore, err := data.NewDataStore()
	require.NoError(t, err)

	eventRouter := event.NewMessageRouter()
	server := NewMCPServer("test-token", eventRouter, dataStore)

	// Test with unknown tool
	_, err = server.ExecuteTool(context.Background(), "unknown_tool", map[string]interface{}{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown tool")
}
