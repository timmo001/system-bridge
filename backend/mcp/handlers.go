package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"log/slog"

	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
	"github.com/timmo001/system-bridge/types"
	"github.com/timmo001/system-bridge/utils/handlers/command"
)

type toolHandlers struct {
	eventRouter  *event.MessageRouter
	dataStore    *data.DataStore
	loadSettings func() (*settings.Settings, error)
}

type getDataInput struct {
	Modules []types.ModuleName `json:"modules"`
}

type notificationInput struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Icon    string `json:"icon,omitempty"`
}

type mediaControlInput struct {
	Action string `json:"action"`
}

type displayControlInput struct {
	ID         string   `json:"id"`
	Brightness *float64 `json:"brightness,omitempty"`
	PowerState string   `json:"power_state,omitempty"`
}

type getHistoryInput struct {
	Since   int64              `json:"since,omitempty"`
	Modules []types.ModuleName `json:"modules,omitempty"`
}

type runCommandInput struct {
	ID string `json:"id"`
}

func (h toolHandlers) handleGetData(_ context.Context, _ *sdkmcp.CallToolRequest, input getDataInput) (*sdkmcp.CallToolResult, any, error) {
	result := make(map[string]interface{})
	for _, moduleName := range input.Modules {
		module, err := h.dataStore.GetModule(moduleName)
		if err != nil {
			slog.Warn("Module not found", "module", moduleName, "error", err)
			continue
		}
		result[string(moduleName)] = module.Data
	}

	return formatToolResult(result)
}

func (h toolHandlers) handleNotification(_ context.Context, _ *sdkmcp.CallToolRequest, input notificationInput) (*sdkmcp.CallToolResult, any, error) {
	arguments := map[string]interface{}{"title": input.Title, "message": input.Message}
	if input.Icon != "" {
		arguments["icon"] = input.Icon
	}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventNotification,
		Data:  arguments,
	}

	response := h.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, nil, fmt.Errorf("%s", response.Message)
	}

	return formatToolResult(map[string]interface{}{
		"success": true,
		"message": response.Message,
	})
}

func (h toolHandlers) handleMediaControl(_ context.Context, _ *sdkmcp.CallToolRequest, input mediaControlInput) (*sdkmcp.CallToolResult, any, error) {
	arguments := map[string]interface{}{"action": input.Action}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventMediaControl,
		Data:  arguments,
	}

	response := h.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, nil, fmt.Errorf("%s", response.Message)
	}

	return formatToolResult(map[string]interface{}{
		"success": true,
		"message": response.Message,
	})
}

func (h toolHandlers) handleDisplayControl(_ context.Context, _ *sdkmcp.CallToolRequest, input displayControlInput) (*sdkmcp.CallToolResult, any, error) {
	arguments := map[string]interface{}{"id": input.ID}
	if input.Brightness != nil {
		arguments["brightness"] = *input.Brightness
	}
	if input.PowerState != "" {
		arguments["power_state"] = input.PowerState
	}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventDisplayControl,
		Data:  arguments,
	}

	response := h.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, nil, fmt.Errorf("%s", response.Message)
	}

	return formatToolResult(map[string]interface{}{
		"success": true,
		"message": response.Message,
	})
}

func (h toolHandlers) handleGetHistory(_ context.Context, _ *sdkmcp.CallToolRequest, input getHistoryInput) (*sdkmcp.CallToolResult, any, error) {
	arguments := map[string]interface{}{"since": input.Since}
	if len(input.Modules) > 0 {
		arguments["modules"] = input.Modules
	}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventGetHistory,
		Data:  arguments,
	}

	response := h.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, nil, fmt.Errorf("%s", response.Message)
	}

	return formatToolResult(response.Data)
}

func (h toolHandlers) handleListCommands(_ context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, any, error) {
	cfg, err := h.loadSettings()
	if err != nil {
		return nil, nil, fmt.Errorf("load settings: %w", err)
	}

	commands := cfg.Commands.Allowlist
	if commands == nil {
		commands = []settings.SettingsCommandDefinition{}
	}
	return formatToolResult(commands)
}

func (h toolHandlers) handleRunCommand(ctx context.Context, _ *sdkmcp.CallToolRequest, input runCommandInput) (*sdkmcp.CallToolResult, any, error) {
	cfg, err := h.loadSettings()
	if err != nil {
		return nil, nil, fmt.Errorf("load settings: %w", err)
	}

	result, err := command.Run(ctx, command.ExecuteRequest{CommandID: input.ID, RequestID: generateID(), Connection: "mcp"}, cfg)
	if err != nil {
		return nil, nil, err
	}

	return formatToolResult(result)
}
func generateID() string {
	return fmt.Sprintf("mcp-%d", time.Now().UnixNano())
}

func formatToolResult(result interface{}) (*sdkmcp.CallToolResult, any, error) {
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("format tool result: %v", err)
	}

	return &sdkmcp.CallToolResult{Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: string(resultJSON)}}}, nil, nil
}
