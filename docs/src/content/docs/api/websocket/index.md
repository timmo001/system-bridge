---
title: Overview
description: Connect to the System Bridge WebSocket API and understand the request, response, and error message formats shared across every event.
---

The WebSocket API gives you a single persistent connection to System Bridge for live data and control. Every feature uses the same message envelope, so once you understand the format below, each event page builds on it.

## Sections

- [Data](/api/websocket/data/): Request system data on demand or subscribe to live updates.
- [Input](/api/websocket/input/): Simulate keyboard input on the host.
- [Control](/api/websocket/control/): Control media, notifications, opening paths and URLs, and power state.
- [System](/api/websocket/system/): Browse files, read and update settings, run allowlisted commands, and exit the backend.

## Connecting

Connect to the WebSocket API at:

```http
GET /api/websocket
```

By default this is served on port `9170`, so the full URL is usually `ws://{host}:9170/api/websocket`.

## Request format

Every message you send uses the same envelope:

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "EVENT_NAME",
    "data": {}
}
```

- `id`: An identifier you choose. It is echoed back on the response so you can match requests to responses.
- `token`: Your API token. See [how to find your token](/using/cli/#token).
- `event`: The event to trigger (for example `GET_DATA`).
- `data`: The payload for the event. Use `{}` when the event takes no data.

## Response format

Responses use a different envelope to requests:

```json title="Response"
{
    "id": "abc123",
    "type": "RESPONSE_TYPE",
    "subtype": "NONE",
    "data": {},
    "message": "Human-readable message",
    "module": "system"
}
```

- `id`: The same `id` you sent on the request.
- `type`: The response type (for example `DATA_UPDATE`).
- `subtype`: Extra context. `NONE` on success, or an error code when `type` is `ERROR`.
- `data`: The response payload.
- `message`: A human-readable description.
- `module`: The data module the response relates to, when applicable.

## Errors

When a request fails, the response `type` is `ERROR` and `subtype` describes the cause:

```json title="Error response"
{
    "id": "abc123",
    "type": "ERROR",
    "subtype": "BAD_TOKEN",
    "data": {},
    "message": "Invalid token"
}
```

Possible error subtypes include:

- `BAD_REQUEST`, `BAD_TOKEN`, `BAD_JSON`
- `BAD_DIRECTORY`, `BAD_FILE`, `BAD_PATH`
- `INVALID_ACTION`, `MISSING_ACTION`
- `LISTENER_ALREADY_REGISTERED`, `LISTENER_NOT_REGISTERED`
- `MISSING_BASE`, `MISSING_KEY`, `MISSING_MODULES`, `MISSING_PATH`, `MISSING_PATH_URL`
- `MISSING_SETTING`, `MISSING_TEXT`, `MISSING_TITLE`, `MISSING_TOKEN`, `MISSING_VALUE`
- `COMMAND_NOT_FOUND`, `UNKNOWN_EVENT`
