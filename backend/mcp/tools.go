package mcp

import (
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/timmo001/system-bridge/data"
	"github.com/timmo001/system-bridge/event"
	"github.com/timmo001/system-bridge/settings"
)

func registerTools(server *sdkmcp.Server, eventRouter *event.MessageRouter, dataStore *data.DataStore) {
	handlers := toolHandlers{eventRouter: eventRouter, dataStore: dataStore, loadSettings: settings.Load}

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_audio_control",
		Description: "Set an audio output's, input's or app's volume or mute state, make an output or input the default, or move an app to another output. Get ids from the audio module.",
		InputSchema: objectSchema(map[string]any{
			"id": map[string]any{"type": "string", "description": "Id from the audio module's outputs, inputs or apps"},
			"volume": map[string]any{
				"type":        "number",
				"description": "Volume in percent",
				"minimum":     0,
				"maximum":     100,
			},
			"muted":   map[string]any{"type": "boolean", "description": "Whether to mute the device"},
			"default": map[string]any{"type": "boolean", "description": "Make the device the default output or input"},
			"output":  map[string]any{"type": "string", "description": "An output's id, to move an app's sound to it. Linux only."},
		}, []string{"id"}),
	}, handlers.handleAudioControl)

	deviceAddress := objectSchema(map[string]any{
		"address": map[string]any{"type": "string", "description": "Device address from the bluetooth module's devices"},
	}, []string{"address"})

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_bluetooth_connect",
		Description: "Connect a paired Bluetooth device, waiting until it's connected. Get addresses from the bluetooth module. Linux only.",
		InputSchema: deviceAddress,
	}, eventTool[bluetoothDeviceInput](handlers, event.EventBluetoothConnect))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_bluetooth_disconnect",
		Description: "Disconnect a paired Bluetooth device. Get addresses from the bluetooth module. Linux only.",
		InputSchema: deviceAddress,
	}, eventTool[bluetoothDeviceInput](handlers, event.EventBluetoothDisconnect))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_bluetooth_forget",
		Description: "Forget (unpair) a Bluetooth device, so it has to be paired again before it can connect. Get addresses from the bluetooth module. Only use this when the user asks to forget or unpair the device.",
		InputSchema: deviceAddress,
	}, eventTool[bluetoothDeviceInput](handlers, event.EventBluetoothForget))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_bluetooth_set_power",
		Description: "Turn the Bluetooth adapter on or off. Turning it off disconnects every device. Linux only.",
		InputSchema: objectSchema(map[string]any{
			"powered": map[string]any{"type": "boolean", "description": "Whether the adapter should be on"},
		}, []string{"powered"}),
	}, eventTool[bluetoothPowerInput](handlers, event.EventBluetoothSetPower))

	windowID := map[string]any{"type": "string", "description": "Window id from the desktop module's windows"}
	boolean := func(description string) map[string]any {
		return map[string]any{"type": "boolean", "description": description}
	}

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_desktop_close_window",
		Description: "Ask a window to close, as its close button would. Get window ids from the desktop module.",
		InputSchema: objectSchema(map[string]any{"id": windowID}, []string{"id"}),
	}, eventTool[desktopWindowInput](handlers, event.EventDesktopCloseWindow))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_desktop_focus_window",
		Description: "Focus a window, showing its workspace. Get window ids from the desktop module.",
		InputSchema: objectSchema(map[string]any{"id": windowID}, []string{"id"}),
	}, eventTool[desktopWindowInput](handlers, event.EventDesktopFocusWindow))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_desktop_focus_workspace",
		Description: "Show and focus a workspace. Get workspace ids from the desktop module. Not available on Windows.",
		InputSchema: objectSchema(map[string]any{
			"id": map[string]any{"type": "string", "description": "Workspace id from the desktop module's workspaces"},
		}, []string{"id"}),
	}, eventTool[desktopWorkspaceInput](handlers, event.EventDesktopFocusWorkspace))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_desktop_set_keyboard_layout",
		Description: "Switch the keyboard to one of its layouts, from the desktop module's keyboard.layouts. Hyprland and Windows only.",
		InputSchema: objectSchema(map[string]any{
			"layout": map[string]any{"type": "string", "description": "Layout from the desktop module's keyboard.layouts"},
		}, []string{"layout"}),
	}, eventTool[desktopKeyboardLayoutInput](handlers, event.EventDesktopSetKeyboardLayout))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_desktop_set_window_state",
		Description: "Make a window fullscreen, maximised or minimised, or not. Leave out a state to keep it. Hyprland can't minimise, and Windows can't make a window fullscreen.",
		InputSchema: objectSchema(map[string]any{
			"id":         windowID,
			"fullscreen": boolean("Whether the window is fullscreen"),
			"maximised":  boolean("Whether the window is maximised"),
			"minimised":  boolean("Whether the window is minimised"),
		}, []string{"id"}),
	}, eventTool[desktopWindowStateInput](handlers, event.EventDesktopSetWindowState))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_display_control",
		Description: "Set a display's brightness or power state over DDC/CI, or a built-in panel's backlight. Without DDC/CI, Hyprland turns the display on or off. Get display ids from the displays module.",
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

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_get_data",
		Description: "Get system information from data modules (audio, battery, bluetooth, cpu, desktop, disks, displays, gpus, media, memory, networks, processes, sensors, system)",
		InputSchema: objectSchema(map[string]any{
			"modules": map[string]any{
				"type":        "array",
				"description": "List of module names to fetch data from",
				"items": map[string]any{
					"type": "string",
					"enum": []string{"audio", "battery", "bluetooth", "cpu", "desktop", "disks", "displays", "gpus", "media", "memory", "networks", "processes", "sensors", "system"},
				},
			},
		}, []string{"modules"}),
	}, handlers.handleGetData)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_get_history",
		Description: "Get recent readings kept for charts (battery, cpu, disks, gpus, memory, networks, sensors, system). Each series is a list of {time, value} samples, with time in Unix milliseconds. Usage is in percent, temperatures in °C, power in watts, and network and disk rates in bytes per second.",
		InputSchema: objectSchema(map[string]any{
			"since": map[string]any{
				"type":        "integer",
				"description": "Only readings after this time, in Unix milliseconds. Omit for the whole history.",
				"minimum":     0,
			},
			"modules": map[string]any{
				"type":        "array",
				"description": "Only these modules' readings. Omit for every module.",
				"items": map[string]any{
					"type": "string",
					"enum": historyModuleNames(),
				},
			},
		}, []string{}),
	}, handlers.handleGetHistory)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_dispatch",
		Description: "Run a Hyprland dispatcher on the focused window, or another window after focusing it, as its bind would",
		InputSchema: objectSchema(map[string]any{
			"dispatcher": map[string]any{
				"type":        "string",
				"description": "The dispatcher. center_window only acts on floating windows. lock_group and unlock_group act on the window's group, and lock_groups and unlock_groups on every group.",
				"enum": []string{
					"center_window", "cycle_next_window", "cycle_previous_window", "group_next", "group_previous",
					"lock_group", "lock_groups", "move_focus", "swap_window", "toggle_group", "toggle_split",
					"unlock_group", "unlock_groups",
				},
			},
			"id": map[string]any{"type": "string", "description": "Window id from the desktop module's windows, to focus before running the dispatcher. Leave out for the focused window."},
			"direction": map[string]any{
				"type":        "string",
				"description": "Direction for move_focus and swap_window",
				"enum":        []string{"down", "left", "right", "up"},
			},
		}, []string{"dispatcher"}),
	}, eventTool[hyprlandDispatchInput](handlers, event.EventHyprlandDispatch))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_move_window",
		Description: "Move a window to a workspace on Hyprland, leaving the focus where it is",
		InputSchema: objectSchema(map[string]any{
			"id": windowID,
			"workspace": map[string]any{
				"type":        "string",
				"description": "Workspace id from the desktop module's workspaces, or the number of a new one",
			},
		}, []string{"id", "workspace"}),
	}, eventTool[hyprlandMoveWindowInput](handlers, event.EventHyprlandMoveWindow))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_reload_config",
		Description: "Reload Hyprland's config",
		InputSchema: objectSchema(map[string]any{}, []string{}),
	}, eventTool[struct{}](handlers, event.EventHyprlandReloadConfig))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_run_global_shortcut",
		Description: "Trigger a global shortcut an app registered with Hyprland, as a bind to it would. Get names from the desktop module's hyprland.global_shortcuts.",
		InputSchema: objectSchema(map[string]any{
			"name": map[string]any{"type": "string", "description": "Shortcut name from hyprland.global_shortcuts"},
		}, []string{"name"}),
	}, eventTool[hyprlandGlobalShortcutInput](handlers, event.EventHyprlandRunGlobalShortcut))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_rename_workspace",
		Description: "Rename a workspace on Hyprland, or give it back its default name",
		InputSchema: objectSchema(map[string]any{
			"id":   map[string]any{"type": "string", "description": "Workspace id from the desktop module's workspaces"},
			"name": map[string]any{"type": "string", "description": "The new name. Leave out for the default."},
		}, []string{"id"}),
	}, eventTool[hyprlandRenameWorkspaceInput](handlers, event.EventHyprlandRenameWorkspace))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_move_workspace",
		Description: "Move a workspace to another display on Hyprland",
		InputSchema: objectSchema(map[string]any{
			"id":      map[string]any{"type": "string", "description": "Workspace id from the desktop module's workspaces"},
			"display": map[string]any{"type": "string", "description": "Display id from the displays module"},
		}, []string{"id", "display"}),
	}, eventTool[hyprlandMoveWorkspaceInput](handlers, event.EventHyprlandMoveWorkspace))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_set_option",
		Description: "Set one of Hyprland's config options that System Bridge allows, until the config reloads. Get them and their types from the desktop module's hyprland.options.",
		InputSchema: objectSchema(map[string]any{
			"name": map[string]any{"type": "string", "description": "Option name from hyprland.options, such as animations.enabled"},
			"value": map[string]any{
				"type":        []string{"boolean", "integer"},
				"description": "true or false for a bool option, or a whole number, 0 or more, for an int option",
			},
		}, []string{"name", "value"}),
	}, eventTool[hyprlandOptionInput](handlers, event.EventHyprlandSetOption))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_set_submap",
		Description: "Switch Hyprland's binds to a submap, or back to the default. Submaps are the binds' submap in the desktop module's hyprland.binds.",
		InputSchema: objectSchema(map[string]any{
			"name": map[string]any{"type": "string", "description": "Submap name. Leave out for the default."},
		}, []string{}),
	}, eventTool[hyprlandSubmapInput](handlers, event.EventHyprlandSetSubmap))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_set_window",
		Description: "Float or tile a window on Hyprland, pin or unpin it, and move or resize it. Leave out a setting to keep it.",
		InputSchema: objectSchema(map[string]any{
			"id":       windowID,
			"floating": boolean("Whether the window floats"),
			"pinned":   boolean("Whether the window is pinned, showing on every workspace"),
			"x":        map[string]any{"type": "integer", "description": "Where to put the window's left edge, in pixels across every display. Needs y."},
			"y":        map[string]any{"type": "integer", "description": "Where to put the window's top edge, in pixels across every display. Needs x."},
			"width":    map[string]any{"type": "integer", "description": "The window's width in pixels. Needs height.", "minimum": 1},
			"height":   map[string]any{"type": "integer", "description": "The window's height in pixels. Needs width.", "minimum": 1},
		}, []string{"id"}),
	}, eventTool[hyprlandSetWindowInput](handlers, event.EventHyprlandSetWindow))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_hyprland_kill_window",
		Description: "Kill a window's app on Hyprland, without asking it to close first. Use system_bridge_desktop_close_window to ask it to close.",
		InputSchema: objectSchema(map[string]any{
			"id": windowID,
		}, []string{"id"}),
	}, eventTool[desktopWindowInput](handlers, event.EventHyprlandKillWindow))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_kill_process",
		Description: "End a process, by its id from the processes module. It asks the process to stop, or with force ends it straight away, losing anything unsaved. Check the process's name first.",
		InputSchema: objectSchema(map[string]any{
			"id":    map[string]any{"type": "integer", "description": "Process id from the processes module", "minimum": 1},
			"force": boolean("End the process straight away rather than asking it to stop"),
		}, []string{"id"}),
	}, eventTool[processKillInput](handlers, event.EventProcessKill))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_list_commands",
		Description: "List the commands the user has allowed System Bridge to run. An entry with a prefab and no command runs that prefab's program for the platform.",
		InputSchema: objectSchema(map[string]any{}, []string{}),
	}, handlers.handleListCommands)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_list_command_prefabs",
		Description: "List the ready-made commands System Bridge has, such as locking the screen, with whether each can run on this system, what it would run, and why not. They only run once the user adds them to the allowlist.",
		InputSchema: objectSchema(map[string]any{}, []string{}),
	}, handlers.handleListCommandPrefabs)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_media_control",
		Description: "Control media playback on the system. SEEK needs position, SET_VOLUME volume, SET_SHUFFLE shuffle and SET_REPEAT repeat. Get player ids from the media module's players; on Windows only the actions up to MUTE work, and not with a player.",
		InputSchema: objectSchema(map[string]any{
			"action": map[string]any{
				"type":        "string",
				"description": "Media control action to perform (must be uppercase)",
				"enum":        []string{"PLAY", "PAUSE", "STOP", "NEXT", "PREVIOUS", "VOLUME_UP", "VOLUME_DOWN", "MUTE", "SEEK", "SET_VOLUME", "SET_SHUFFLE", "SET_REPEAT"},
			},
			"player":   map[string]any{"type": "string", "description": "A player's id from the media module's players. Leave it out for the player the module reports."},
			"position": map[string]any{"type": "number", "minimum": 0, "description": "Seconds from the start of the track, for SEEK"},
			"volume":   map[string]any{"type": "number", "minimum": 0, "maximum": 1, "description": "The player's volume from 0 to 1, for SET_VOLUME"},
			"shuffle":  boolean("Whether to shuffle, for SET_SHUFFLE"),
			"repeat": map[string]any{
				"type":        "string",
				"description": "What to repeat, for SET_REPEAT",
				"enum":        []string{"NONE", "TRACK", "LIST"},
			},
		}, []string{"action"}),
	}, eventTool[mediaControlInput](handlers, event.EventMediaControl))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_set_clipboard",
		Description: "Put text on the system's clipboard, so it can be pasted there. Linux only.",
		InputSchema: objectSchema(map[string]any{
			"text": map[string]any{"type": "string", "description": "The text to put on the clipboard"},
		}, []string{"text"}),
	}, eventTool[clipboardTextInput](handlers, event.EventClipboardSetText))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_set_power_profile",
		Description: "Switch the power profile, such as to power-saver or performance. Get the profiles from the system module's power_profiles. Linux with power-profiles-daemon only.",
		InputSchema: objectSchema(map[string]any{
			"profile": map[string]any{"type": "string", "description": "One of the system module's power_profiles, such as balanced"},
		}, []string{"profile"}),
	}, eventTool[powerProfileInput](handlers, event.EventSystemSetPowerProfile))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_set_keep_awake",
		Description: "Keep the system from idling, so it doesn't lock, blank the screen or sleep for being idle, or let it idle again. On Omarchy this is the bar's stay awake switch. Linux only.",
		InputSchema: objectSchema(map[string]any{
			"enabled":  boolean("Whether to keep the system awake"),
			"duration": map[string]any{"type": "integer", "minimum": 0, "description": "Seconds until the system may idle again. Leave it out to keep it awake until told otherwise."},
		}, []string{"enabled"}),
	}, eventTool[keepAwakeInput](handlers, event.EventSystemSetKeepAwake))

	omarchyAction := map[string]any{
		"type":        "string",
		"description": "Whether to open, close or toggle it",
		"enum":        []string{"close", "open", "toggle"},
	}
	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_omarchy_menu",
		Description: "Open, close or toggle the Omarchy menu at one of its routes. Get ids from the desktop module's omarchy.menus.",
		InputSchema: objectSchema(map[string]any{
			"id":     map[string]any{"type": "string", "description": "Menu id from omarchy.menus, such as root. Not needed to close it."},
			"action": omarchyAction,
		}, []string{"action"}),
	}, eventTool[omarchyInput](handlers, event.EventOmarchyMenu))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_omarchy_panel",
		Description: "Open, close or toggle an Omarchy shell panel or overlay. Get ids from the desktop module's omarchy.panels.",
		InputSchema: objectSchema(map[string]any{
			"id":     map[string]any{"type": "string", "description": "Panel id from omarchy.panels"},
			"action": omarchyAction,
		}, []string{"id", "action"}),
	}, eventTool[omarchyInput](handlers, event.EventOmarchyPanel))

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_run_command",
		Description: "Run a command from the allowlist and wait for it to finish, returning its exit code and output. Get command ids from system_bridge_list_commands.",
		InputSchema: objectSchema(map[string]any{
			"id": map[string]any{"type": "string", "description": "Command id from the allowlist"},
		}, []string{"id"}),
	}, handlers.handleRunCommand)

	sdkmcp.AddTool(server, &sdkmcp.Tool{
		Name:        "system_bridge_send_notification",
		Description: "Send a desktop notification to the system",
		InputSchema: objectSchema(map[string]any{
			"title":   map[string]any{"type": "string", "description": "Notification title"},
			"message": map[string]any{"type": "string", "description": "Notification message body"},
			"icon":    map[string]any{"type": "string", "description": "Icon name (optional)"},
		}, []string{"title", "message"}),
	}, handlers.handleNotification)
}

func historyModuleNames() []string {
	modules := data.HistoryModules()
	names := make([]string, 0, len(modules))
	for _, module := range modules {
		names = append(names, string(module))
	}
	return names
}

func objectSchema(properties map[string]any, required []string) map[string]any {
	return map[string]any{"type": "object", "properties": properties, "required": required}
}
