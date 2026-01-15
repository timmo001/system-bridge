package mcp

// GetToolDefinitions returns all available MCP tools
func GetToolDefinitions() []Tool {
	return []Tool{
		{
			Name:        "system_bridge_get_data",
			Description: "Get system information from data modules (cpu, memory, disks, battery, displays, gpus, media, network, processes, system, sensors)",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"modules": map[string]interface{}{
						"type":        "array",
						"description": "List of module names to fetch data from",
						"items": map[string]interface{}{
							"type": "string",
							"enum": []string{
								"battery", "cpu", "disks", "displays", "gpus",
								"media", "memory", "networks", "processes", "sensors", "system",
							},
						},
					},
				},
				"required": []string{"modules"},
			},
		},
		{
			Name:        "system_bridge_send_notification",
			Description: "Send a desktop notification to the system",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"title": map[string]interface{}{
						"type":        "string",
						"description": "Notification title",
					},
					"message": map[string]interface{}{
						"type":        "string",
						"description": "Notification message body",
					},
					"icon": map[string]interface{}{
						"type":        "string",
						"description": "Icon name (optional)",
					},
				},
				"required": []string{"title", "message"},
			},
		},
		{
			Name:        "system_bridge_media_control",
			Description: "Control media playback on the system",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"action": map[string]interface{}{
						"type":        "string",
						"description": "Media control action to perform (must be uppercase)",
						"enum":        []string{"PLAY", "PAUSE", "STOP", "NEXT", "PREVIOUS", "VOLUME_UP", "VOLUME_DOWN", "MUTE"},
					},
				},
				"required": []string{"action"},
			},
		},
	}
}
