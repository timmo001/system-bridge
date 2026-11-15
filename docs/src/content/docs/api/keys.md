---
title: Keys
description: List, make and remove the keys clients sign in with, and trade the old API token for a key, over the HTTP API.
---

Each client signs in with its own [key](/api/#authentication). These routes list the clients with a key, make one by hand and remove one. The web client uses them under **Settings > Devices**.

## List the clients with a key

Needs a key, as `Authorization: Bearer`.

```http
GET /api/keys
Authorization: Bearer {key}
```

```json title="Response"
{
  "clients": [
    {
      "id": "owner",
      "name": "Owner",
      "kind": "owner",
      "scopes": ["all"],
      "created": "2026-11-15T18:33:06Z",
      "lastUsed": "2026-11-15T18:42:24Z"
    },
    {
      "id": "4c1f…",
      "name": "Pixel 9",
      "kind": "android",
      "scopes": ["all"],
      "created": "2026-11-15T19:02:11Z"
    },
    {
      "id": "8b2e…",
      "name": "Home Assistant MCP",
      "kind": "key",
      "scopes": ["all"],
      "created": "2026-11-15T19:10:40Z",
      "lastUsed": "2026-11-15T19:12:03Z",
      "usedInUrl": "2026-11-15T19:11:02Z"
    }
  ]
}
```

`kind` says how the client got its key, such as `android` from pairing, `web` for a browser, `key` for one made by hand, `cli` for one made on the computer, or `owner`. `lastUsed` is left out until the key is used, and is updated at most once a minute. `usedInUrl` is when the key was first sent in a URL, to the [MCP server](/api/mcp), where it can end up in a client's history or logs. A new key for the client clears it. The keys themselves are never listed.

## Make a key

Needs a key. Give the key a name to recognise it by.

```http
POST /api/keys
Authorization: Bearer {key}
Content-Type: application/json

{ "name": "My script" }
```

```json title="Response"
{
  "key": "system-bridge_client_…",
  "client": { "id": "8b2e…", "name": "My script", "kind": "key" }
}
```

The key is only shown in this answer. Copy it now, as System Bridge keeps only its hash.

## Remove a key

Needs a key. The client signs out at once, and can't connect again until it has another key.

```http
DELETE /api/keys?id={client id}
Authorization: Bearer {key}
```

Answers `204` when removed, or `404` when there's no client with that id.

## Exchange the API token

Before keys, every client used one shared API token. A client that has it trades it for its own key here, once, then uses the key instead. This is the only route that takes the token alone, and it goes when the token does.

Send the token as `Authorization: Bearer`, with the client. The client keeps its `id`, so exchanging again replaces its key rather than adding another.

```http
POST /api/keys/exchange
Authorization: Bearer {token}
Content-Type: application/json

{
  "client": { "id": "a3f0…", "name": "Home Assistant", "kind": "home-assistant" }
}
```

```json title="Response"
{
  "key": "system-bridge_client_…",
  "client": { "id": "a3f0…", "name": "Home Assistant", "kind": "home-assistant" }
}
```

A wrong token, or a key, gets `401`. A client without an `id`, `name` or `kind` gets `400`.
