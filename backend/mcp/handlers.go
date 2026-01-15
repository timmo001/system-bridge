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
	slog.Info("Executing MCP tool", "tool", toolName, "arguments", arguments)

	switch toolName {
	case "system_bridge_get_data":
		return s.handleGetData(ctx, arguments)
	case "system_bridge_send_notification":
		return s.handleNotification(ctx, arguments)
	case "system_bridge_list_directory":
		return s.handleListDirectory(ctx, arguments)
	case "system_bridge_read_file":
		return s.handleReadFile(ctx, arguments)
	case "system_bridge_execute_command":
		return s.handleExecuteCommand(ctx, arguments)
	case "system_bridge_media_control":
		return s.handleMediaControl(ctx, arguments)
	case "system_bridge_keyboard_press":
		return s.handleKeyboardPress(ctx, arguments)
	case "system_bridge_keyboard_text":
		return s.handleKeyboardText(ctx, arguments)
	case "system_bridge_power_shutdown":
		return s.handlePowerShutdown(ctx, arguments)
	case "system_bridge_power_restart":
		return s.handlePowerRestart(ctx, arguments)
	case "system_bridge_power_sleep":
		return s.handlePowerSleep(ctx, arguments)
	case "system_bridge_power_hibernate":
		return s.handlePowerHibernate(ctx, arguments)
	case "system_bridge_power_lock":
		return s.handlePowerLock(ctx, arguments)
	case "system_bridge_power_logout":
		return s.handlePowerLogout(ctx, arguments)
	case "system_bridge_open":
		return s.handleOpen(ctx, arguments)
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

// handleListDirectory lists directory contents
func (s *MCPServer) handleListDirectory(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventGetDirectory,
		Data:  arguments,
	}

	response := s.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, fmt.Errorf("%s", response.Message)
	}

	return response.Data, nil
}

// handleReadFile reads file contents
func (s *MCPServer) handleReadFile(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventGetFile,
		Data:  arguments,
	}

	response := s.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, fmt.Errorf("%s", response.Message)
	}

	return response.Data, nil
}

// handleExecuteCommand executes a pre-configured command
func (s *MCPServer) handleExecuteCommand(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	// Execute command asynchronously
	message := event.Message{
		ID:    generateID(),
		Event: event.EventCommandExecute,
		Data:  arguments,
	}

	response := s.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, fmt.Errorf("%s", response.Message)
	}

	// Return immediately - command executes asynchronously
	// The command will send results via WebSocket when complete
	return map[string]interface{}{
		"success": true,
		"message": response.Message,
		"note":    "Command is executing asynchronously. Results will be delivered separately.",
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

// handleKeyboardPress presses a keyboard key
func (s *MCPServer) handleKeyboardPress(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventKeyboardKeypress,
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

// handleKeyboardText types text
func (s *MCPServer) handleKeyboardText(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventKeyboardText,
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

// handlePowerShutdown shuts down the system
func (s *MCPServer) handlePowerShutdown(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventPowerShutdown,
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

// handlePowerRestart restarts the system
func (s *MCPServer) handlePowerRestart(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventPowerRestart,
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

// handlePowerSleep puts the system to sleep
func (s *MCPServer) handlePowerSleep(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventPowerSleep,
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

// handlePowerHibernate hibernates the system
func (s *MCPServer) handlePowerHibernate(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventPowerHibernate,
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

// handlePowerLock locks the system
func (s *MCPServer) handlePowerLock(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventPowerLock,
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

// handlePowerLogout logs out the current user
func (s *MCPServer) handlePowerLogout(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventPowerLogout,
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

// handleOpen opens a file, directory, or URL
func (s *MCPServer) handleOpen(ctx context.Context, arguments map[string]interface{}) (interface{}, error) {
	message := event.Message{
		ID:    generateID(),
		Event: event.EventOpen,
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
