# System Bridge MCP Server

Model Context Protocol (MCP) server for System Bridge, allowing AI
assistants to remotely control and monitor your system through a
standardized protocol.

Ask your AI assistant:

- "Check my CPU usage"
- "Send me a notification when this is done"
- "Play the current media"
- "Get information about my disks"

The MCP server exposes System Bridge capabilities as standardized tools
that any MCP-compatible client (like Claude Desktop, Cursor, VS Code
extensions, etc.) can use to interact with your system.

## Endpoint

**WebSocket URL:** `ws://localhost:9170/api/mcp`

The MCP server uses WebSocket transport for bi-directional communication
with clients.

## Authentication

The MCP endpoint uses the same token authentication as the regular
WebSocket endpoint.

### Option 1: Token in URL Query Parameter

```text
ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE
```

### Option 2: Token in Authorization Header

```text
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
  - Available modules: `battery`, `cpu`, `disks`, `displays`, `gpus`,
    `media`, `memory`, `networks`, `processes`, `sensors`, `system`

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

### Media Control

#### `system_bridge_media_control`

Control media playback.

**Parameters:**

- `action` (string, required): Media control action (must be uppercase)
  - Available actions: `PLAY`, `PAUSE`, `STOP`, `NEXT`, `PREVIOUS`,
    `VOLUME_UP`, `VOLUME_DOWN`, `MUTE`

**Example:**

```json
{
  "name": "system_bridge_media_control",
  "arguments": {
    "action": "PLAY"
  }
}
```

## Client Configuration

### Quick Setup (Deep Link Install)

#### Claude Desktop (Quick)

Copy and paste this deep link into your browser (replace
`YOUR_TOKEN_HERE` with your token):

```text
claude://addServer/system-bridge?transport=websocket&url=ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE
```

#### Cursor (Quick)

Copy and paste this deep link into your browser (replace
`YOUR_TOKEN_HERE` with your token):

```text
cursor://addServer/system-bridge?command=websocat&args=ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE
```

> **Note:** Requires `websocat` to be installed. See
> [Manual Configuration - Cursor](#cursor) for installation
> instructions.

### Manual Configuration

#### Claude Desktop

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

#### Claude Code (CLI)

Add to your Claude Code configuration file:

**Linux/macOS:** `~/.claude/settings.json`
**Windows:** `%APPDATA%\Claude\settings.json`

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

Or use the CLI command:

```bash
claude mcp add system-bridge --transport websocket --url "ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE"
```

#### Cursor

**Note:** Cursor does not support WebSocket transport directly, so we
use `websocat` as a bridge.

##### Step 1: Install websocat

- **Linux/macOS:** `brew install websocat`
- **Windows:** Download from
  [websocat releases](https://github.com/vi/websocat/releases)

##### Step 2: Configure Cursor

Add to your Cursor configuration file:

**Linux/macOS:** `~/.cursor/mcp_settings.json`

**Windows:** `%APPDATA%\Cursor\User\globalStorage\mcp_settings.json`

```json
{
  "mcpServers": {
    "system-bridge": {
      "command": "websocat",
      "args": [
        "ws://localhost:9170/api/mcp?token=YOUR_TOKEN_HERE"
      ]
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with your actual System Bridge token.

**How it works:** `websocat` acts as a bridge between Cursor's stdio
transport and System Bridge's WebSocket endpoint.

### Custom MCP Client

Any MCP-compatible client can connect using the standard MCP protocol
over WebSocket:

1. **Connect** to `ws://localhost:9170/api/mcp?token=YOUR_TOKEN`
2. **Initialize** with protocol version `2024-11-05`
3. **List tools** using `tools/list` method
4. **Call tools** using `tools/call` method

## Protocol Details

The MCP server implements JSON-RPC 2.0 over WebSocket with the
following methods:

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
      "version": "5.0.0"  // Dynamic: reports actual System Bridge version
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

- **Token Authentication:** All connections must provide a valid API
  token
- **Read-Only Data Access:** The `get_data` tool provides read-only
  access to system information
- **Same Restrictions:** MCP uses the same security model as the
  regular System Bridge API

## Troubleshooting

### Connection Refused

- Ensure System Bridge is running:
  `systemctl status system-bridge` (Linux)
- Check the port is correct (default: 9170)
- Verify your token is correct: `system-bridge client token`

### Unauthorized Error

- Token is missing or incorrect
- Add token to URL or Authorization header

### Tool Execution Fails

- Check System Bridge logs for detailed error messages
- Ensure required parameters are provided
- Verify module names are valid (for `get_data` tool)
- Ensure media control actions are uppercase (for `media_control` tool)

## Example Usage

### Using Claude Desktop

Once configured, you can ask Claude to:

- "Check my CPU usage"
- "Send me a notification when this is done"
- "What's my current memory usage?"
- "Pause the current media playback"
- "Get information about my battery status"

### Using Custom MCP Client

Any MCP-compatible client can connect to the WebSocket endpoint. Example using Python:

```python
import asyncio
import websockets
import json

async def main():
    token = "YOUR_TOKEN_HERE"
    uri = f"ws://localhost:9170/api/mcp?token={token}"
    
    async with websockets.connect(uri) as websocket:
        # Initialize
        await websocket.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "custom-client", "version": "1.0.0"}
            }
        }))
        response = await websocket.recv()
        print(f"Initialize: {response}")
        
        # List tools
        await websocket.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }))
        response = await websocket.recv()
        print(f"Tools: {response}")
        
        # Call a tool
        await websocket.send(json.dumps({
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "system_bridge_get_data",
                "arguments": {"modules": ["cpu"]}
            }
        }))
        response = await websocket.recv()
        print(f"Result: {response}")

asyncio.run(main())
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
