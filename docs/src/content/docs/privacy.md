---
title: Privacy and security
description: What System Bridge sends, receives and stores, who can access it, and what they can do.
---

System Bridge has no accounts, telemetry, analytics or crash reporting, and it never sends your system data anywhere. Clients on your machine or network fetch it from System Bridge, and only with your API token. To be found on your local network, System Bridge does share your hostname and IP address there without a token (see [Network discovery](#network-discovery)).

This page lists every way the app communicates, so you can decide what to allow.

## Summary

| Connection | Direction | Where | When |
| --- | --- | --- | --- |
| [API server](#api-server) | Incoming | Port `9170` | Always |
| [Network discovery](#network-discovery) | Both | Port `1900`, mDNS | Always |
| [Update check](#update-check) | Outgoing | `api.github.com` | Up to 12 an hour |
| [DNS lookups](#dns-lookups) | Outgoing | Your DNS server | Every minute |
| [Discord](#optional-discord) | Outgoing | `discord.com` | [If set up](/running/#discord) |

"Always" means whenever the backend runs. The API server and network discovery are reachable from your local network. Apart from Discord, which only runs if you set it up, none of these can currently be turned off.

Nothing else leaves your machine unless you ask for it, for example by opening a URL.

## API server

The backend listens on port `9170` on every network interface, so other devices on your network can reach it. Change the port with `SYSTEM_BRIDGE_PORT`.

The API uses plain HTTP and WebSocket, without TLS. Anyone who can see your network traffic can read the data and your API token as they pass. Use it on networks you trust, or put it behind a TLS proxy or VPN.

### What needs the API token

Your API token is a random UUID, created on first start and stored in the `token` file in the [settings directory](/running/#file-locations). Only your user can read it.

These need no token, and only show that System Bridge is running:

- `/api`: a fixed status message.
- `/api/health`: the status, current time and System Bridge version.
- The [web client](/using/web-client/) files. The web client asks for your token before it shows any data.

Everything else needs the token:

| Endpoint | How the token is sent |
| --- | --- |
| `/api/data/{module}` | `X-API-Token` or `token` header |
| `/api/media/file/data` | `token` query parameter |
| `/api/websocket` | `token` field in every message. The connection closes if no valid message arrives within 10 seconds. |
| `/api/mcp` | `token` query parameter or `Authorization: Bearer` header |
| `/api/quit` | `X-API-Token` header |

The WebSocket and MCP endpoints accept connections from any web origin, so the token is their only protection.

### What a client with your token can do

Treat the token like a password. A client with it can:

- Read every [data module](/api/data/). These include your hostname, IP and MAC addresses, logged-in users, running processes, what's playing, which apps are using your camera or microphone, and your Discord voice state.
- List files and read file details anywhere your user can access, starting from your user directories and any media directories you add.
- Download media files from your user directories and media directories.
- Open any file your user can access, open URLs, send notifications, and type keys and text.
- Run commands from your command allowlist, and nothing else. The allowlist is empty by default.
- Lock, sleep, restart or shut down your machine, or log you out.
- Read and change System Bridge settings.
- Mute, deafen and change volumes in Discord, if you've set it up.

System Bridge only sends system data to clients that have connected with the token and asked for it.

## Network discovery

System Bridge announces itself on your local network so apps like [Home Assistant](/using/home-assistant/) can find it. These messages stay on your local network and aren't routed to the internet.

### SSDP

- Every 30 seconds, System Bridge sends an SSDP `NOTIFY` message to the multicast address `239.255.255.250:1900`. It contains your hostname, local IP address and API port.
- It answers SSDP searches for System Bridge, or for all devices, with the same details.
- It serves a device description at `http://{host}:1900/description.xml`, with no token needed. The description contains your hostname, local IP address and API port.

Change the SSDP port with `SYSTEM_BRIDGE_SSDP_PORT`.

### mDNS

System Bridge advertises the `_system-bridge._tcp` service with your hostname, IP addresses and API port, and answers mDNS queries for it.

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
| `token` | Your API token, readable only by your user |
| `data/{module}.json` | The latest data for each module, rewritten on every update |
| `discord.json` | Your Discord application's credentials, if you set up Discord |
| `discord-token.json` | Your Discord access token, readable only by your user |

The web client stores the host, port and API token you connect with in your browser's local storage. When you open the web client from the system tray, these are passed in the URL.

### Logs

System Bridge writes one log file a day to the [logs directory](/running/#file-locations). Only your user can read them, and they're deleted after 7 days.

The default `WARN` level only logs warnings and errors. If you raise it to `INFO`, logs also include:

- Your API token, logged at startup.
- The web client URL, including your token, when you open it from the system tray.
- The contents of notification, open, command, power and settings requests.

At `DEBUG`, logs also include the contents of other requests, such as the text in keyboard text requests.

Logs stay on your machine. Before you share them in a bug report, check them and remove your token.

## Optional: Discord

Nothing happens until you create `discord.json` in the settings directory. Until then, System Bridge only checks for that file every 30 seconds. It doesn't connect to Discord, and the `discord` module doesn't exist.

Once you've set it up:

- System Bridge connects to the Discord desktop app through its local socket, or a named pipe on Windows. This connection stays on your machine. System Bridge uses it to read and change your mute, deafen and volume settings.
- When you first authorise, and whenever the access token expires, System Bridge sends a request to `https://discord.com/api/oauth2/token`. The request contains your application's client ID and client secret, plus the authorisation code or refresh token. Discord replies with an access token.
- The access token is stored in `discord-token.json` in the settings directory, and only your user can read it. Delete it to authorise again.

What Discord does with these requests is covered by [Discord's privacy policy](https://discord.com/privacy).
