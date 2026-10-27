# System Bridge MCP Server

This package exposes System Bridge data and actions through the Model Context
Protocol (MCP). The public setup guide and tools reference are at
[system-bridge.timmo.dev/api/mcp](https://system-bridge.timmo.dev/api/mcp/).

## Architecture

`MCPServer` is registered on `/api/mcp` by `backend/backend.go`. It owns one MCP
SDK server, registers the package's tools, authenticates every request, and
dispatches the request by transport:

- Normal HTTP requests use the SDK Streamable HTTP handler. It runs statelessly
  and returns JSON responses.
- WebSocket upgrade requests use the legacy SDK-backed WebSocket transport in `transport.go`.

The Streamable HTTP endpoint is the primary transport. The WebSocket transport
remains for compatibility and for stdio-only clients connected through a bridge
such as `websocat`.

## Authentication

Both transports use the System Bridge API token. `MCPServer.ServeHTTP` accepts either:

- A `token` query parameter, such as `http://localhost:9170/api/mcp?token=YOUR_TOKEN`
- An `Authorization: Bearer YOUR_TOKEN` header

Authentication runs before transport dispatch. Missing or invalid tokens
receive `401 Unauthorized`.

## Transports

### Streamable HTTP

The primary endpoint is:

```text
http://{host}:9170/api/mcp
```

Remote MCP clients should connect with their Streamable HTTP transport. Use
`https://` when the endpoint is exposed through SSL configuration or TLS
termination.

### Legacy WebSocket

WebSocket upgrades on the same route are handled by the package's
`webSocketTransport` and `webSocketConnection` SDK adapters:

```text
ws://{host}:9170/api/mcp
```

The adapter decodes and encodes SDK JSON-RPC messages and serialises writes to
the connection. Use `wss://` when connecting through TLS.

## Tools

Tools are registered in `tools.go` and implemented in `handlers.go`:

- `system_bridge_audio_control` sets an audio device's volume or mute state, or
  makes it the default.
- `system_bridge_bluetooth_connect` connects a paired Bluetooth device.
- `system_bridge_bluetooth_disconnect` disconnects a paired Bluetooth device.
- `system_bridge_bluetooth_forget` forgets (unpairs) a Bluetooth device.
- `system_bridge_bluetooth_set_power` turns the Bluetooth adapter on or off.
- `system_bridge_desktop_close_window` asks a window to close.
- `system_bridge_desktop_focus_window` focuses a window.
- `system_bridge_desktop_focus_workspace` shows and focuses a workspace.
- `system_bridge_desktop_set_keyboard_layout` switches the keyboard layout.
- `system_bridge_desktop_set_window_state` makes a window fullscreen,
  maximised or minimised, or not.
- `system_bridge_display_control` sets a display's brightness or power state.
- `system_bridge_get_data` returns the latest data for requested modules.
  Supported modules are `audio`, `battery`, `bluetooth`, `cpu`, `desktop`,
  `disks`, `displays`, `gpus`, `media`, `memory`, `networks`, `processes`,
  `sensors`, and `system`.
- `system_bridge_get_history` returns the chart history, through `GET_HISTORY`,
  with optional `since` and `modules`.
- `system_bridge_hyprland_dispatch` runs a named Hyprland dispatcher, such as
  moving focus, toggling the split or locking groups, on the focused window
  or one it focuses first.
- `system_bridge_hyprland_kill_window` kills a window's app on Hyprland,
  without asking it to close.
- `system_bridge_hyprland_move_window` moves a window to a workspace on
  Hyprland.
- `system_bridge_hyprland_move_workspace` moves a workspace to another display
  on Hyprland.
- `system_bridge_hyprland_reload_config` reloads Hyprland's config.
- `system_bridge_hyprland_rename_workspace` renames a workspace on Hyprland.
- `system_bridge_hyprland_run_global_shortcut` triggers a global shortcut an
  app registered with Hyprland.
- `system_bridge_hyprland_set_option` sets one of the allowed Hyprland config
  options until the config reloads.
- `system_bridge_hyprland_set_submap` switches Hyprland's binds to a submap,
  or back to the default.
- `system_bridge_hyprland_set_window` floats or tiles, pins or unpins, and
  moves or resizes a window on Hyprland.
- `system_bridge_list_command_prefabs` lists the ready-made commands, with
  whether each can run on this system, from `prefab.List`.
- `system_bridge_list_commands` lists the command allowlist.
- `system_bridge_media_control` performs one of `MUTE`, `NEXT`, `PAUSE`, `PLAY`,
  `PREVIOUS`, `STOP`, `VOLUME_DOWN`, or `VOLUME_UP`.
- `system_bridge_omarchy_menu` opens, closes or toggles the Omarchy menu.
- `system_bridge_omarchy_panel` opens, closes or toggles an Omarchy shell panel.
- `system_bridge_run_command` runs a command from the allowlist and waits for
  its result through `command.Run`.
- `system_bridge_send_notification` sends a desktop notification with required
  `title` and `message` fields and an optional `icon`.

Power actions are left out on purpose, as an assistant could trigger them by
mistake.

Keep tool schemas, typed handler inputs, and the
[public tools reference](https://system-bridge.timmo.dev/api/mcp/#tools) in sync
when changing a tool.

## Testing

`server_test.go` covers authentication, Streamable HTTP and WebSocket SDK
clients, tool discovery, schemas, and handler results. Run the repository's Go
test task from the repository root:

```bash
mise run test
```

## References

- [Public MCP setup and tools reference](https://system-bridge.timmo.dev/api/mcp/)
- [Model Context Protocol documentation](https://modelcontextprotocol.io/)
- [Go MCP SDK](https://github.com/modelcontextprotocol/go-sdk)
