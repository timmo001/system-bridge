# System Bridge MCP Server

Model Context Protocol (MCP) server for System Bridge, allowing AI assistants to remotely control and monitor your system through a standardized protocol.

## Overview

The MCP server exposes System Bridge capabilities as standardized tools that any MCP-compatible client (like Claude Desktop, VS Code extensions, etc.) can use to interact with your system.

## Endpoint

**WebSocket URL:** `ws://localhost:9170/api/mcp`

The MCP server uses WebSocket transport for bi-directional communication with clients.

## Authentication

The MCP endpoint uses the same token authentication as the regular WebSocket endpoint.

### Option 1: Token in URL Query Parameter

```
ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE
```

### Option 2: Token in Authorization Header

```
Authorization: Bearer YOUR_TOKEN_HERE
```

To get your token, run:
```bash
system-bridge client token
```

## Available Tools

The MCP server exposes the following tools:

### System Information

#### `system_bridge_get_data`
Get system information from data modules.

**Parameters:**
- `modules` (array of strings, required): Module names to fetch
  - Available modules: `battery`, `cpu`, `disks`, `displays`, `gpus`, `media`, `memory`, `networks`, `processes`, `sensors`, `system`

**Example:**
```json
{
  "name": "system_bridge_get_data",
  "arguments": {
    "modules": ["cpu", "memory", "disks"]
  }
}
```

### Notifications

#### `system_bridge_send_notification`
Send a desktop notification.

**Parameters:**
- `title` (string, required): Notification title
- `message` (string, required): Notification message
- `icon` (string, optional): Icon name

**Example:**
```json
{
  "name": "system_bridge_send_notification",
  "arguments": {
    "title": "Build Complete",
    "message": "Your build finished successfully"
  }
}
```

### Filesystem

#### `system_bridge_list_directory`
List contents of a directory.

**Parameters:**
- `path` (string, required): Directory path

#### `system_bridge_read_file`
Read contents of a file.

**Parameters:**
- `path` (string, required): File path

### Command Execution

#### `system_bridge_execute_command`
Execute a pre-configured command from the allowlist.

**Parameters:**
- `commandID` (string, required): Command ID from settings allowlist

**Security Note:** Only commands defined in your System Bridge settings allowlist can be executed. This prevents arbitrary command execution.

### Media Control

#### `system_bridge_media_control`
Control media playback.

**Parameters:**
- `action` (string, required): One of `play`, `pause`, `stop`, `next`, `previous`

### Keyboard Input

#### `system_bridge_keyboard_press`
Press a keyboard key.

**Parameters:**
- `key` (string, required): Key to press (e.g., `enter`, `space`, `ctrl`)

#### `system_bridge_keyboard_text`
Type text using the keyboard.

**Parameters:**
- `text` (string, required): Text to type

### Power Management

#### `system_bridge_power_shutdown`
Shutdown the system.

#### `system_bridge_power_restart`
Restart the system.

#### `system_bridge_power_sleep`
Put the system to sleep.

#### `system_bridge_power_hibernate`
Hibernate the system.

#### `system_bridge_power_lock`
Lock the system.

#### `system_bridge_power_logout`
Log out the current user.

### File Operations

#### `system_bridge_open`
Open a file, directory, or URL with the default application.

**Parameters:**
- `path` (string, required): Path or URL to open

## Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**Linux/macOS:** `~/.config/claude/mcp.json`
**Windows:** `%APPDATA%\Claude\mcp.json`

```json
{
  "mcpServers": {
    "system-bridge": {
      "transport": "websocket",
      "url": "ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE"
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with your actual System Bridge token.

### Custom MCP Client

Any MCP-compatible client can connect using the standard MCP protocol over WebSocket:

1. **Connect** to `ws://localhost:9170/api/mcp?token=YOUR_TOKEN`
2. **Initialize** with protocol version `2024-11-05`
3. **List tools** using `tools/list` method
4. **Call tools** using `tools/call` method

## Protocol Details

The MCP server implements JSON-RPC 2.0 over WebSocket with the following methods:

### `initialize`
Handshake and capability negotiation.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "system-bridge",
      "version": "5.0.0"
    }
  }
}
```

### `tools/list`
List available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "system_bridge_get_data",
        "description": "Get system information...",
        "inputSchema": { ... }
      }
    ]
  }
}
```

### `tools/call`
Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "system_bridge_get_data",
    "arguments": {
      "modules": ["cpu", "memory"]
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"cpu\": {...}, \"memory\": {...}}"
      }
    ]
  }
}
```

## Security

- **Token Authentication:** All connections must provide a valid API token
- **Command Allowlist:** Only pre-configured commands can be executed
- **Same Restrictions:** MCP uses the same security model as the regular System Bridge API

## Troubleshooting

### Connection Refused
- Ensure System Bridge is running: `systemctl status system-bridge` (Linux)
- Check the port is correct (default: 9170)
- Verify your token is correct: `system-bridge client token`

### Unauthorized Error
- Token is missing or incorrect
- Add token to URL or Authorization header

### Tool Execution Fails
- Check System Bridge logs for detailed error messages
- For command execution, verify the command is in your allowlist
- Ensure required parameters are provided

## Example Usage

### Using Claude Desktop

Once configured, you can ask Claude to:

- "Check my CPU usage"
- "Send me a notification when this is done"
- "List the files in my Downloads folder"
- "Execute the backup command"
- "Lock my computer in 5 minutes"

### Using Python MCP SDK

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="system-bridge",
        args=["mcp"],
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            
            # Call a tool
            result = await session.call_tool(
                "system_bridge_get_data",
                arguments={"modules": ["cpu"]}
            )
```

## Development

### Adding New Tools

1. Add tool definition to `tools.go`
2. Implement handler in `handlers.go`
3. Add case to `ExecuteTool` switch statement
4. Update this README

### Testing

Run MCP tests:
```bash
go test ./backend/mcp/
```

## References

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [System Bridge Documentation](https://system-bridge.timmo.dev/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/model-context-protocol)
