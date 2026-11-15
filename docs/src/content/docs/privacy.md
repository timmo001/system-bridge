---
title: Privacy and security
description: What System Bridge sends, receives and stores, who can access it, and what they can do.
---

System Bridge has no accounts, telemetry, analytics or crash reporting, and it never sends your system data anywhere. Clients on your machine or network fetch it from System Bridge, and only with a key. To be found on your local network, System Bridge does share your hostname and IP address there without a key (see [Network discovery](#network-discovery)).

This page lists every way the app communicates, so you can decide what to allow.

## Summary

| Connection | Direction | Where | When |
| --- | --- | --- | --- |
| [API server](#api-server) | Incoming | Port `9170` | Always |
| [Network discovery](#network-discovery) | Both | mDNS | Always |
| [Update check](#update-check) | Outgoing | `api.github.com` | Up to 12 an hour |
| [DNS lookups](#dns-lookups) | Outgoing | Your DNS server | Every minute |
| [Discord](#optional-discord) | Outgoing | `discord.com` | [If set up](/features/discord/) |

"Always" means whenever the backend runs. The API server and network discovery are reachable from your local network. Apart from Discord, which only runs if you set it up, none of these can currently be turned off.

Nothing else leaves your machine unless you ask for it, for example by opening a URL.

## API server

The backend listens on port `9170` on every network interface, so other devices on your network can reach it. Change the port with `SYSTEM_BRIDGE_PORT`.

The API uses plain HTTP and WebSocket, without TLS. Anyone who can see your network traffic can read the data and the keys as they pass. Use it on networks you trust, or put it behind a TLS proxy or VPN.

### What needs a key

Each client has its own [key](/api/#authentication), from pairing or made by hand, listed under **Settings > Devices** in the web client. A key is shown once, when it's made. System Bridge keeps only its SHA-256 hash, in the `keys.json` file in the [settings directory](/running/#file-locations), which only your user can read. Remove a client's key to sign it out. Keys are never logged.

These need no key, and only show that System Bridge is running:

- `/api`: a fixed status message.
- `/api/health`: the status, current time and System Bridge version.
- The [web client](/using/web-client/) files. The web client asks for a key before it shows any data.

Everything else needs a key:

| Endpoint | How the key is sent |
| --- | --- |
| HTTP routes, such as `/api/data/{module}` and `/api/quit` | `Authorization: Bearer` header |
| `/api/media/file/data` | No key: a URL System Bridge signs for one file, which only reads that file until it expires |
| `/api/websocket` | The first message, `{"type": "auth", "key": "..."}`. A wrong key closes the connection, as does no valid message within 10 seconds. |
| `/api/mcp` | `Authorization: Bearer` header, or the `key` query parameter for clients that only take a URL. System Bridge never logs that URL, and **Settings > Devices** marks each key that has been sent in one. |

The WebSocket and MCP endpoints accept connections from any web origin, so the key is their only protection.

Before keys, every client used one shared API token, a random UUID in the `token` file. Until it's removed in a later release, it still works where it did, including in the `X-API-Token` header, each WebSocket message's `token` field and the `token` query parameter of the MCP and media file endpoints, and a client can [trade it for its own key](/api/keys#exchange-the-api-token).

### What a client with a key can do

Every key can do everything, so treat each like a password. A client with one can:

- Read every [data module](/api/data/). These include your hostname, IP and MAC addresses, logged-in users, running processes, what's playing, which apps are using your camera or microphone, and your Discord voice state and latest notification.
- List files and read file details anywhere your user can access, starting from your user directories and any media directories you add.
- Download media files from your user directories and media directories.
- Open any file your user can access, open URLs, send notifications, and type keys and text.
- Run commands from your command allowlist, and nothing else. The allowlist is empty by default.
- Lock, sleep, restart or shut down your machine, or log you out.
- Read and change System Bridge settings.
- Mute, deafen, change volumes, toggle your camera and screenshare, and play soundboard sounds in Discord, if you've set it up.

System Bridge only sends system data to clients that have connected with a key and asked for it.

## Network discovery

System Bridge announces itself on your local network over mDNS so apps like [Home Assistant](/using/home-assistant/) can find it. These messages stay on your local network and aren't routed to the internet.

System Bridge advertises the `_system-bridge._tcp` service with your hostname, IP addresses, API port and system UUID, and answers mDNS queries for it. Home Assistant uses these to find it and tell machines apart.

The `system-bridge client discovery` command also sends mDNS queries for `_system-bridge._tcp` and `_http._tcp` to find other System Bridge instances.

## Update check

The `system` module reports whether a newer version is available. To find out, System Bridge requests the latest release from:

```text
https://api.github.com/repos/timmo001/system-bridge/releases/latest
```

- The request is a plain `GET` with Go's default `User-Agent`. It sends no version, identifier or system data.
- The result is cached for 5 minutes, so the request runs about 12 times an hour at most, with a hard limit of 30.
- GitHub sees your public IP address, as with any web request.
- The request uses the proxy in your `HTTPS_PROXY` environment variable, if set.

When you open **What's new** in the web client, System Bridge also requests the newest release notes from:

```text
https://api.github.com/repos/timmo001/system-bridge/releases?per_page=10
```

This request is the same kind of plain `GET`, through the same proxy. Its result is cached for 6 hours, and it only runs when a client asks for the notes.

## DNS lookups

When it updates the `system` module, System Bridge looks up your machine's full domain name: it looks up your hostname, then does a reverse lookup on the addresses it gets back. These lookups go to the DNS server your system uses.

To find your main IPv4 and IPv6 addresses, System Bridge asks the operating system which local address it would use to reach `8.8.8.8` and `2001:4860:4860::8888`. It does this with a UDP connect, which sends no packets, so nothing reaches those addresses.

## Local-only features

These only talk to your operating system and other apps on your machine:

- Media status and control use your system's media controls.
- Notifications use your desktop's notification system.
- Keyboard input, power actions, and opening files and URLs go through your operating system. Opening a URL launches your default browser, which then loads the page.
- The **Documentation** item in the system tray opens this site in your browser.
- The [CLI](/using/cli/) only connects to the backend on `127.0.0.1`.

## Data stored on your machine

System Bridge keeps these files in the [settings directory](/running/#file-locations):

| File | Contents |
| --- | --- |
| `settings.json` | Your settings, including the command allowlist and media directories |
| `keys.json` | Each client's name, kind, key hash, when it was made and last used, and when its key was first sent in a URL. Never the keys. Readable only by your user |
| `owner-key` | The owner key the CLI signs in with, readable only by your user |
| `token` | The old shared API token, until it's removed. Readable only by your user |
| `data/{module}.json` | The latest data for each module, rewritten on every update |
| `data/history.json` | Up to the last 24 hours of the readings the web client graphs, such as CPU, memory, temperatures and network rates, saved every 5 minutes. Readable only by your user |
| `discord.json` | Your Discord application's credentials, if you set up Discord. Readable only by your user when saved from the web client or the API |
| `discord-token.json` | Your Discord access token, readable only by your user |

The web client stores the host, port and its key in your browser's local storage, along with the graphs' time range. When System Bridge opens the web client for you, the host, port and a one-time pairing code are passed in the URL, and the page trades the code for its own key, then takes them off the address. The code works once, for 5 minutes.

### Logs

System Bridge writes one log file a day to the [logs directory](/running/#file-locations). Only your user can read them, and they're deleted after 7 days.

The default `WARN` level only logs warnings and errors. If you raise it to `INFO`, logs also include:

- The contents of notification, open, command, power and settings requests.

At `DEBUG`, logs also include the contents of other requests, such as the text in keyboard text requests.

Discord setup requests are never logged with their contents, so your Discord client secret stays out of the logs at every level. The backend never sends the secret back to clients either, and the Python connector hides it in its own logs.

Logs stay on your machine, and never hold a key, a pairing code or the API token. Before you share them in a bug report, check them for anything else you'd rather keep private.

## Optional: Discord

Nothing happens until you save your Discord application in the web client or create `discord.json` in the settings directory. Until then, System Bridge only checks for that file every 30 seconds. It doesn't connect to Discord, and the `discord` module doesn't exist.

Once you've set it up:

- System Bridge connects to the Discord desktop app through its local socket, or a named pipe on Windows. This connection stays on your machine. System Bridge uses it to read and change your voice settings, camera and screenshare, play soundboard sounds, and read your latest notification.
- When you first authorise, and whenever the access token expires, System Bridge sends a request to `https://discord.com/api/oauth2/token`. The request contains your application's client ID and client secret, plus the authorisation code or refresh token. Discord replies with an access token.
- The access token is stored in `discord-token.json` in the settings directory, and only your user can read it. Delete it to authorise again.

### Discord permissions

When you authorise, Discord asks you to grant these scopes:

| Scope | What System Bridge uses it for |
| --- | --- |
| `rpc` | Reading your voice settings and call, joining, leaving and opening channels, changing your mute, deafen, volume and voice settings, and changing other users' volume and mute for you |
| `rpc.voice.write` | Playing soundboard sounds |
| `rpc.video.read`, `rpc.video.write` | Reading whether your camera is on, and turning it on or off |
| `rpc.screenshare.read`, `rpc.screenshare.write` | Reading whether you're sharing your screen, and starting or stopping it |
| `rpc.notifications.read` | Reading your latest Discord notification: its channel, title, body and icon |

If an update adds a scope, Discord asks you to authorise again.

What Discord does with these requests is covered by [Discord's privacy policy](https://discord.com/privacy).
