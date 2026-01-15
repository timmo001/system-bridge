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
			Name:        "system_bridge_list_directory",
			Description: "List contents of a directory",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Directory path to list",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "system_bridge_read_file",
			Description: "Read the contents of a file",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "File path to read",
					},
				},
				"required": []string{"path"},
			},
		},
		{
			Name:        "system_bridge_execute_command",
			Description: "Execute a pre-configured command from the allowlist. Only commands defined in settings can be executed.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"commandID": map[string]interface{}{
						"type":        "string",
						"description": "ID of the command to execute (must be in settings allowlist)",
					},
				},
				"required": []string{"commandID"},
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
						"description": "Media control action to perform",
						"enum":        []string{"play", "pause", "stop", "next", "previous"},
					},
				},
				"required": []string{"action"},
			},
		},
		{
			Name:        "system_bridge_keyboard_press",
			Description: "Press a keyboard key",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"key": map[string]interface{}{
						"type":        "string",
						"description": "Key to press (e.g., 'enter', 'space', 'a', 'ctrl')",
					},
				},
				"required": []string{"key"},
			},
		},
		{
			Name:        "system_bridge_keyboard_text",
			Description: "Type text using the keyboard",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"text": map[string]interface{}{
						"type":        "string",
						"description": "Text to type",
					},
				},
				"required": []string{"text"},
			},
		},
		{
			Name:        "system_bridge_power_shutdown",
			Description: "Shutdown the system",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "system_bridge_power_restart",
			Description: "Restart the system",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "system_bridge_power_sleep",
			Description: "Put the system to sleep",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "system_bridge_power_hibernate",
			Description: "Hibernate the system",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "system_bridge_power_lock",
			Description: "Lock the system",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "system_bridge_power_logout",
			Description: "Log out the current user",
			InputSchema: map[string]interface{}{
				"type":       "object",
				"properties": map[string]interface{}{},
			},
		},
		{
			Name:        "system_bridge_open",
			Description: "Open a file, directory, or URL with the default application",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"path": map[string]interface{}{
						"type":        "string",
						"description": "Path or URL to open",
					},
				},
				"required": []string{"path"},
			},
		},
	}
}
