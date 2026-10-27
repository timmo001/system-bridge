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
	"github.com/timmo001/system-bridge/utils/handlers/command/prefab"
)

type toolHandlers struct {
	eventRouter  *event.MessageRouter
	dataStore    *data.DataStore
	loadSettings func() (*settings.Settings, error)
}

type audioControlInput struct {
	ID      string   `json:"id"`
	Volume  *float64 `json:"volume,omitempty"`
	Muted   *bool    `json:"muted,omitempty"`
	Default bool     `json:"default,omitempty"`
}

type bluetoothDeviceInput struct {
	Address string `json:"address"`
}

type bluetoothPowerInput struct {
	Powered bool `json:"powered"`
}

type displayControlInput struct {
	ID         string   `json:"id"`
	Brightness *float64 `json:"brightness,omitempty"`
	PowerState string   `json:"power_state,omitempty"`
}

type desktopKeyboardLayoutInput struct {
	Layout string `json:"layout"`
}

type desktopWindowInput struct {
	ID string `json:"id"`
}

type desktopWindowStateInput struct {
	ID         string `json:"id"`
	Fullscreen *bool  `json:"fullscreen,omitempty"`
	Maximised  *bool  `json:"maximised,omitempty"`
	Minimised  *bool  `json:"minimised,omitempty"`
}

type desktopWorkspaceInput struct {
	ID string `json:"id"`
}

type getDataInput struct {
	Modules []types.ModuleName `json:"modules"`
}

type getHistoryInput struct {
	Since   int64              `json:"since,omitempty"`
	Modules []types.ModuleName `json:"modules,omitempty"`
}

type hyprlandDispatchInput struct {
	Dispatcher string `json:"dispatcher"`
	Direction  string `json:"direction,omitempty"`
	ID         string `json:"id,omitempty"`
}

type hyprlandGlobalShortcutInput struct {
	Name string `json:"name"`
}

type hyprlandMoveWindowInput struct {
	ID        string `json:"id"`
	Workspace string `json:"workspace"`
}

type hyprlandRenameWorkspaceInput struct {
	ID   string `json:"id"`
	Name string `json:"name,omitempty"`
}

type hyprlandMoveWorkspaceInput struct {
	ID      string `json:"id"`
	Display string `json:"display"`
}

type hyprlandOptionInput struct {
	Name  string `json:"name"`
	Value any    `json:"value"`
}

type hyprlandSubmapInput struct {
	Name string `json:"name,omitempty"`
}

type hyprlandSetWindowInput struct {
	ID       string `json:"id"`
	Floating *bool  `json:"floating,omitempty"`
	Pinned   *bool  `json:"pinned,omitempty"`
	X        *int   `json:"x,omitempty"`
	Y        *int   `json:"y,omitempty"`
	Width    *int   `json:"width,omitempty"`
	Height   *int   `json:"height,omitempty"`
}

type processKillInput struct {
	ID    int  `json:"id"`
	Force bool `json:"force,omitempty"`
}

type mediaControlInput struct {
	Action   string   `json:"action"`
	Player   string   `json:"player,omitempty"`
	Position *float64 `json:"position,omitempty"`
	Volume   *float64 `json:"volume,omitempty"`
	Shuffle  *bool    `json:"shuffle,omitempty"`
	Repeat   string   `json:"repeat,omitempty"`
}

type powerProfileInput struct {
	Profile string `json:"profile"`
}

type notificationInput struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Icon    string `json:"icon,omitempty"`
}

type omarchyInput struct {
	ID     string `json:"id,omitempty"`
	Action string `json:"action"`
}

type runCommandInput struct {
	ID string `json:"id"`
}

func (h toolHandlers) handleAudioControl(_ context.Context, _ *sdkmcp.CallToolRequest, input audioControlInput) (*sdkmcp.CallToolResult, any, error) {
	arguments := map[string]interface{}{"id": input.ID}
	if input.Volume != nil {
		arguments["volume"] = *input.Volume
	}
	if input.Muted != nil {
		arguments["muted"] = *input.Muted
	}
	if input.Default {
		arguments["default"] = true
	}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventAudioControl,
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

// eventTool is a tool handler that sends its input as an event's data
func eventTool[T any](h toolHandlers, eventType event.EventType) sdkmcp.ToolHandlerFor[T, any] {
	return func(_ context.Context, _ *sdkmcp.CallToolRequest, input T) (*sdkmcp.CallToolResult, any, error) {
		encoded, err := json.Marshal(input)
		if err != nil {
			return nil, nil, fmt.Errorf("encode tool input: %w", err)
		}
		arguments := map[string]interface{}{}
		if err := json.Unmarshal(encoded, &arguments); err != nil {
			return nil, nil, fmt.Errorf("encode tool input: %w", err)
		}
		message := event.Message{
			ID:    generateID(),
			Event: eventType,
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

func (h toolHandlers) handleListCommandPrefabs(_ context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, any, error) {
	return formatToolResult(prefab.List())
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
