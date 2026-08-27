# System Bridge MCP Server

This package exposes System Bridge data and actions through the Model Context Protocol (MCP). The public setup guide and tools reference are at [system-bridge.timmo.dev/api/mcp](https://system-bridge.timmo.dev/api/mcp/).

## Architecture

`MCPServer` is registered on `/api/mcp` by `backend/backend.go`. It owns one MCP SDK server, registers the package's tools, authenticates every request, and dispatches the request by transport:

- Normal HTTP requests use the SDK Streamable HTTP handler. It runs statelessly and returns JSON responses.
- WebSocket upgrade requests use the legacy SDK-backed WebSocket transport in `transport.go`.

The Streamable HTTP endpoint is the primary transport. The WebSocket transport remains for compatibility and for stdio-only clients connected through a bridge such as `websocat`.

## Authentication

Both transports use the System Bridge API token. `MCPServer.ServeHTTP` accepts either:

- A `token` query parameter, such as `http://localhost:9170/api/mcp?token=YOUR_TOKEN`
- An `Authorization: Bearer YOUR_TOKEN` header

Authentication runs before transport dispatch. Missing or invalid tokens receive `401 Unauthorized`.

## Transports

### Streamable HTTP

The primary endpoint is:

```text
http://{host}:9170/api/mcp
```

Remote MCP clients should connect with their Streamable HTTP transport. Use `https://` when the endpoint is exposed through SSL configuration or TLS termination.

### Legacy WebSocket

WebSocket upgrades on the same route are handled by the package's `webSocketTransport` and `webSocketConnection` SDK adapters:

```text
ws://{host}:9170/api/mcp
```

The adapter decodes and encodes SDK JSON-RPC messages and serialises writes to the connection. Use `wss://` when connecting through TLS.

## Tools

Tools are registered in `tools.go` and implemented in `handlers.go`:

- `system_bridge_get_data` returns the latest data for requested modules. Supported modules are `battery`, `cpu`, `disks`, `displays`, `gpus`, `media`, `memory`, `networks`, `processes`, `sensors`, and `system`.
- `system_bridge_send_notification` sends a desktop notification with required `title` and `message` fields and an optional `icon`.
- `system_bridge_media_control` performs one of `PLAY`, `PAUSE`, `STOP`, `NEXT`, `PREVIOUS`, `VOLUME_UP`, `VOLUME_DOWN`, or `MUTE`.

Keep tool schemas, typed handler inputs, and the [public tools reference](https://system-bridge.timmo.dev/api/mcp/#tools) in sync when changing a tool.

## Testing

`server_test.go` covers authentication, Streamable HTTP and WebSocket SDK clients, tool discovery, schemas, and handler results. Run the repository's Go test task from the repository root:

```bash
mise run test
```

## References

- [Public MCP setup and tools reference](https://system-bridge.timmo.dev/api/mcp/)
- [Model Context Protocol documentation](https://modelcontextprotocol.io/)
- [Go MCP SDK](https://github.com/modelcontextprotocol/go-sdk)
