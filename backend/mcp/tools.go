package mcp

import (
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
)

func registerTools(server *sdkmcp.Server, eventRouter *event.MessageRouter, dataStore *data.DataStore) {
	handlers := toolHandlers{eventRouter: eventRouter, dataStore: dataStore}

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_get_data",
		Description: "Get system information from data modules (cpu, memory, disks, battery, displays, gpus, media, network, processes, system, sensors)",
		InputSchema: objectSchema(map[string]any{
			"modules": map[string]any{
				"type":        "array",
				"description": "List of module names to fetch data from",
				"items": map[string]any{
					"type": "string",
					"enum": []string{"battery", "cpu", "disks", "displays", "gpus", "media", "memory", "networks", "processes", "sensors", "system"},
				},
			},
		}, []string{"modules"}),
	}, handlers.handleGetData)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_send_notification",
		Description: "Send a desktop notification to the system",
		InputSchema: objectSchema(map[string]any{
			"title":   map[string]any{"type": "string", "description": "Notification title"},
			"message": map[string]any{"type": "string", "description": "Notification message body"},
			"icon":    map[string]any{"type": "string", "description": "Icon name (optional)"},
		}, []string{"title", "message"}),
	}, handlers.handleNotification)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_media_control",
		Description: "Control media playback on the system",
		InputSchema: objectSchema(map[string]any{
			"action": map[string]any{
				"type":        "string",
				"description": "Media control action to perform (must be uppercase)",
				"enum":        []string{"PLAY", "PAUSE", "STOP", "NEXT", "PREVIOUS", "VOLUME_UP", "VOLUME_DOWN", "MUTE"},
			},
		}, []string{"action"}),
	}, handlers.handleMediaControl)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_display_control",
		Description: "Set a display's brightness or power state over DDC/CI, or a built-in panel's backlight. Get display ids from the displays module.",
		InputSchema: objectSchema(map[string]any{
			"id": map[string]any{"type": "string", "description": "Display id from the displays module"},
			"brightness": map[string]any{
				"type":        "number",
				"description": "Brightness in percent",
				"minimum":     0,
				"maximum":     100,
			},
			"power_state": map[string]any{
				"type":        "string",
				"description": "Power state to set",
				"enum":        []string{"on", "standby", "suspend", "off"},
			},
		}, []string{"id"}),
	}, handlers.handleDisplayControl)
}

func objectSchema(properties map[string]any, required []string) map[string]any {
	return map[string]any{"type": "object", "properties": properties, "required": required}
}
