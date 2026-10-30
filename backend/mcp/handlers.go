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
	Output  string   `json:"output,omitempty"`
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

type hyprlandOptionNameInput struct {
	Name string `json:"name"`
}

type hyprlandMoveCursorInput struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type hyprlandSendEventInput struct {
	Name string `json:"name"`
}

type hyprlandExecInput struct {
	Command string `json:"command"`
}

type hyprlandDispatchRawInput struct {
	Dispatch string `json:"dispatch"`
}

type hyprlandEvalInput struct {
	Code string `json:"code"`
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

type openInput struct {
	URL  string `json:"url,omitempty"`
	Path string `json:"path,omitempty"`
}

type keypressInput struct {
	Key       string   `json:"key"`
	Modifiers []string `json:"modifiers,omitempty"`
	Delay     int      `json:"delay,omitempty"`
}

type keyboardTextInput struct {
	Text  string `json:"text"`
	Delay int    `json:"delay,omitempty"`
}

type discordControlInput struct {
	Action    string   `json:"action"`
	ChannelID string   `json:"channel_id,omitempty"`
	UserID    string   `json:"user_id,omitempty"`
	SoundID   string   `json:"sound_id,omitempty"`
	DeviceID  string   `json:"device_id,omitempty"`
	Mode      string   `json:"mode,omitempty"`
	Value     *float64 `json:"value,omitempty"`
}

type clipboardTextInput struct {
	Text string `json:"text"`
}

type powerProfileInput struct {
	Profile string `json:"profile"`
}

type keepAwakeInput struct {
	Enabled  bool `json:"enabled"`
	Duration *int `json:"duration,omitempty"`
}

type notificationInput struct {
	Title   string `json:"title"`
	Message string `json:"message"`
	Icon    string `json:"icon,omitempty"`
	Urgency string `json:"urgency,omitempty"`
}

type omarchyInput struct {
	ID     string `json:"id,omitempty"`
	Action string `json:"action"`
}

type runCommandInput struct {
	ID string `json:"id"`
}

// actionOutput is what a tool that changes something returns
type actionOutput struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// getDataOutput holds the data of each module asked for. A module that
// isn't ready yet is left out.
type getDataOutput struct {
	Audio     *types.AudioData     `json:"audio,omitempty"`
	Battery   *types.BatteryData   `json:"battery,omitempty"`
	Bluetooth *types.BluetoothData `json:"bluetooth,omitempty"`
	Cameras   *types.CamerasData   `json:"cameras,omitempty"`
	CPU       *types.CPUData       `json:"cpu,omitempty"`
	Desktop   *types.DesktopData   `json:"desktop,omitempty"`
	Disks     *types.DisksData     `json:"disks,omitempty"`
	Displays  *types.DisplaysData  `json:"displays,omitempty"`
	GPUs      *types.GPUsData      `json:"gpus,omitempty"`
	Media     *types.MediaData     `json:"media,omitempty"`
	Memory    *types.MemoryData    `json:"memory,omitempty"`
	Networks  *types.NetworksData  `json:"networks,omitempty"`
	Processes *types.ProcessesData `json:"processes,omitempty"`
	Sensors   *types.SensorsData   `json:"sensors,omitempty"`
	System    *types.SystemData    `json:"system,omitempty"`
}

// commandsOutput wraps the allowlist, as structured output must be an object
type commandsOutput struct {
	Commands []settings.SettingsCommandDefinition `json:"commands"`
}

// commandPrefabsOutput wraps the prefabs, as structured output must be an object
type commandPrefabsOutput struct {
	Prefabs []types.CommandPrefab `json:"prefabs"`
}

func (h toolHandlers) handleAudioControl(_ context.Context, _ *sdkmcp.CallToolRequest, input audioControlInput) (*sdkmcp.CallToolResult, actionOutput, error) {
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
	if input.Output != "" {
		arguments["output"] = input.Output
	}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventAudioControl,
		Data:  arguments,
	}

	response := h.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, actionOutput{}, fmt.Errorf("%s", response.Message)
	}

	return actionResult(response.Message)
}

func (h toolHandlers) handleDisplayControl(_ context.Context, _ *sdkmcp.CallToolRequest, input displayControlInput) (*sdkmcp.CallToolResult, actionOutput, error) {
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
		return nil, actionOutput{}, fmt.Errorf("%s", response.Message)
	}

	return actionResult(response.Message)
}

// eventTool is a tool handler that sends its input as an event's data
func eventTool[T any](h toolHandlers, eventType event.EventType) sdkmcp.ToolHandlerFor[T, actionOutput] {
	return func(_ context.Context, _ *sdkmcp.CallToolRequest, input T) (*sdkmcp.CallToolResult, actionOutput, error) {
		encoded, err := json.Marshal(input)
		if err != nil {
			return nil, actionOutput{}, fmt.Errorf("encode tool input: %w", err)
		}
		arguments := map[string]interface{}{}
		if err := json.Unmarshal(encoded, &arguments); err != nil {
			return nil, actionOutput{}, fmt.Errorf("encode tool input: %w", err)
		}
		message := event.Message{
			ID:    generateID(),
			Event: eventType,
			Data:  arguments,
		}

		response := h.eventRouter.HandleMessage("mcp", message)
		if response.Type == event.ResponseTypeError {
			return nil, actionOutput{}, fmt.Errorf("%s", response.Message)
		}

		return actionResult(response.Message)
	}
}

// queryTool is a tool handler that sends its input as an event's data and
// returns the reply's data
func queryTool[T any, R any](h toolHandlers, eventType event.EventType) sdkmcp.ToolHandlerFor[T, R] {
	return func(_ context.Context, _ *sdkmcp.CallToolRequest, input T) (*sdkmcp.CallToolResult, R, error) {
		var zero R
		encoded, err := json.Marshal(input)
		if err != nil {
			return nil, zero, fmt.Errorf("encode tool input: %w", err)
		}
		arguments := map[string]interface{}{}
		if err := json.Unmarshal(encoded, &arguments); err != nil {
			return nil, zero, fmt.Errorf("encode tool input: %w", err)
		}
		response := h.eventRouter.HandleMessage("mcp", event.Message{
			ID:    generateID(),
			Event: eventType,
			Data:  arguments,
		})
		if response.Type == event.ResponseTypeError {
			return nil, zero, fmt.Errorf("%s", response.Message)
		}
		output, ok := response.Data.(*R)
		if !ok || output == nil {
			return nil, zero, fmt.Errorf("unexpected reply data %T", response.Data)
		}
		return toolResult(*output, *output)
	}
}

func (h toolHandlers) handleGetData(_ context.Context, _ *sdkmcp.CallToolRequest, input getDataInput) (*sdkmcp.CallToolResult, getDataOutput, error) {
	var output getDataOutput
	for _, moduleName := range input.Modules {
		module, err := h.dataStore.GetModule(moduleName)
		if err != nil {
			slog.Warn("Module not found", "module", moduleName, "error", err)
			continue
		}
		if module.Data == nil {
			continue
		}
		if err := setModuleData(&output, moduleName, module.Data); err != nil {
			slog.Warn("Module data doesn't match its type", "module", moduleName, "error", err)
		}
	}

	return toolResult(output, output)
}

// setModuleData puts a module's data in its field of the output. Data read
// back from the cache is a generic map, so it's decoded into the module's
// type.
func setModuleData(output *getDataOutput, name types.ModuleName, data any) error {
	var err error
	switch name {
	case types.ModuleAudio:
		output.Audio, err = moduleData[types.AudioData](data)
	case types.ModuleBattery:
		output.Battery, err = moduleData[types.BatteryData](data)
	case types.ModuleBluetooth:
		output.Bluetooth, err = moduleData[types.BluetoothData](data)
	case types.ModuleCameras:
		output.Cameras, err = moduleData[types.CamerasData](data)
	case types.ModuleCPU:
		output.CPU, err = moduleData[types.CPUData](data)
	case types.ModuleDesktop:
		output.Desktop, err = moduleData[types.DesktopData](data)
	case types.ModuleDisks:
		output.Disks, err = moduleData[types.DisksData](data)
	case types.ModuleDisplays:
		output.Displays, err = moduleData[types.DisplaysData](data)
	case types.ModuleGPUs:
		output.GPUs, err = moduleData[types.GPUsData](data)
	case types.ModuleMedia:
		output.Media, err = moduleData[types.MediaData](data)
	case types.ModuleMemory:
		output.Memory, err = moduleData[types.MemoryData](data)
	case types.ModuleNetworks:
		output.Networks, err = moduleData[types.NetworksData](data)
	case types.ModuleProcesses:
		output.Processes, err = moduleData[types.ProcessesData](data)
	case types.ModuleSensors:
		output.Sensors, err = moduleData[types.SensorsData](data)
	case types.ModuleSystem:
		output.System, err = moduleData[types.SystemData](data)
	default:
		err = fmt.Errorf("unknown module")
	}
	return err
}

func moduleData[T any](data any) (*T, error) {
	if value, ok := data.(T); ok {
		return &value, nil
	}
	encoded, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	var value T
	if err := json.Unmarshal(encoded, &value); err != nil {
		return nil, err
	}
	return &value, nil
}

func (h toolHandlers) handleGetHistory(_ context.Context, _ *sdkmcp.CallToolRequest, input getHistoryInput) (*sdkmcp.CallToolResult, types.MetricHistory, error) {
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
		return nil, types.MetricHistory{}, fmt.Errorf("%s", response.Message)
	}
	history, ok := response.Data.(types.MetricHistory)
	if !ok {
		return nil, types.MetricHistory{}, fmt.Errorf("unexpected history data %T", response.Data)
	}

	return toolResult(history, history)
}

func (h toolHandlers) handleListCommands(_ context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, commandsOutput, error) {
	cfg, err := h.loadSettings()
	if err != nil {
		return nil, commandsOutput{}, fmt.Errorf("load settings: %w", err)
	}

	commands := cfg.Commands.Allowlist
	if commands == nil {
		commands = []settings.SettingsCommandDefinition{}
	}
	return toolResult(commands, commandsOutput{Commands: commands})
}

func (h toolHandlers) handleListCommandPrefabs(_ context.Context, _ *sdkmcp.CallToolRequest, _ struct{}) (*sdkmcp.CallToolResult, commandPrefabsOutput, error) {
	prefabs := prefab.List()
	return toolResult(prefabs, commandPrefabsOutput{Prefabs: prefabs})
}

func (h toolHandlers) handleNotification(_ context.Context, _ *sdkmcp.CallToolRequest, input notificationInput) (*sdkmcp.CallToolResult, actionOutput, error) {
	arguments := map[string]interface{}{"title": input.Title, "message": input.Message}
	if input.Icon != "" {
		arguments["icon"] = input.Icon
	}
	if input.Urgency != "" {
		arguments["urgency"] = input.Urgency
	}
	message := event.Message{
		ID:    generateID(),
		Event: event.EventNotification,
		Data:  arguments,
	}

	response := h.eventRouter.HandleMessage("mcp", message)
	if response.Type == event.ResponseTypeError {
		return nil, actionOutput{}, fmt.Errorf("%s", response.Message)
	}

	return actionResult(response.Message)
}

func (h toolHandlers) handleRunCommand(ctx context.Context, _ *sdkmcp.CallToolRequest, input runCommandInput) (*sdkmcp.CallToolResult, command.ExecuteResult, error) {
	cfg, err := h.loadSettings()
	if err != nil {
		return nil, command.ExecuteResult{}, fmt.Errorf("load settings: %w", err)
	}

	result, err := command.Run(ctx, command.ExecuteRequest{CommandID: input.ID, RequestID: generateID(), Connection: "mcp"}, cfg)
	if err != nil {
		return nil, command.ExecuteResult{}, err
	}

	return toolResult(result, result)
}
func generateID() string {
	return fmt.Sprintf("mcp-%d", time.Now().UnixNano())
}

func actionResult(message string) (*sdkmcp.CallToolResult, actionOutput, error) {
	output := actionOutput{Success: true, Message: message}
	return toolResult(output, output)
}

// toolResult returns the output as structured content, for clients such as
// code mode that read it, with text as indented JSON for those that don't
func toolResult[Out any](text any, output Out) (*sdkmcp.CallToolResult, Out, error) {
	resultJSON, err := json.MarshalIndent(text, "", "  ")
	if err != nil {
		var zero Out
		return nil, zero, fmt.Errorf("format tool result: %v", err)
	}

	return &sdkmcp.CallToolResult{Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: string(resultJSON)}}}, output, nil
}
