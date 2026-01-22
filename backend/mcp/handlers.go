package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"log/slog"

	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/types"
)

// ExecuteTool routes tool calls to appropriate handlers
func (s *MCPServer) ExecuteTool(ctx context.Context, toolName string, arguments map[string]interface{}) (interface{}, error) {
	slog.Debug("Executing MCP tool", "tool", toolName, "arguments", arguments)

	switch toolName {
	case "system_bridge_get_data":
		return s.handleGetData(ctx, arguments)
	case "system_bridge_send_notification":
		return s.handleNotification(ctx, arguments)
	case "system_bridge_media_control":
		return s.handleMediaControl(ctx, arguments)
	default:
		return nil, fmt.Errorf("unknown tool: %s", toolName)
	}
}

// handleGetData gets system data from specified modules
func (s *MCPServer) handleGetData(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	modulesRaw, ok := arguments["modules"]
	if !ok {
		return nil, fmt.Errorf("missing required parameter: modules")
	}

	modulesArray, ok := modulesRaw.([]interface{})
	if !ok {
		return nil, fmt.Errorf("modules must be an array")
	}

	modules := make([]types.ModuleName, 0, len(modulesArray))
	for _, m := range modulesArray {
		moduleStr, ok := m.(string)
		if !ok {
			return nil, fmt.Errorf("module names must be strings")
		}
		modules = append(modules, types.ModuleName(moduleStr))
	}

	// Get data for each module
	result := make(map[string]interface{})
	for _, moduleName := range modules {
		module, err := s.dataStore.GetModule(moduleName)
		if err != nil {
			slog.Warn("Module not found", "module", moduleName, "error", err)
			continue
		}
		result[string(moduleName)] = module.Data
	}

	return result, nil
}

// handleNotification sends a desktop notification
func (s *MCPServer) handleNotification(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventNotification,
		Data:  arguments,
	}

	response := s.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, fmt.Errorf("%s", response.Message)
	}

	return map[string]interface{}{
		"success": true,
		"message": response.Message,
	}, nil
}

// handleMediaControl controls media playback
func (s *MCPServer) handleMediaControl(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventMediaControl,
		Data:  arguments,
	}

	response := s.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, fmt.Errorf("%s", response.Message)
	}

	return map[string]interface{}{
		"success": true,
		"message": response.Message,
	}, nil
}

// generateID generates a unique request ID
func generateID() string {
	return fmt.Sprintf("mcp-%d", time.Now().UnixNano())
}

// formatToolResult converts a result into MCP ToolCallResult format
func formatToolResult(result interface{}) ToolCallResult {
	// Convert result to JSON string
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return ToolCallResult{
			Content: []ContentItem{
				{
					Type: "text",
					Text: fmt.Sprintf("Error formatting result: %v", err),
				},
			},
		}
	}

	return ToolCallResult{
		Content: []ContentItem{
			{
				Type: "text",
				Text: string(resultJSON),
			},
		},
	}
}
