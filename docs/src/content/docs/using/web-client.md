---
title: Web Client
description: Monitor and control System Bridge from the built-in browser interface.
---

The web client is the built-in browser interface served by the System Bridge backend. Use it to view live system data, change settings, and trigger actions without writing any code.

## Opening the web client

### Desktop

When you launch System Bridge from your desktop app launcher, the web client opens automatically.

While System Bridge is running, you can also open the web client from the system tray. See the [Desktop](/using/desktop/) page for the system tray and desktop app.

### Terminal

Start the backend and open the web client in your browser with:

```bash
system-bridge backend --open-web-client
```

By default the backend serves the web client on port `9170`. When opened for you, it loads `http://127.0.0.1:9170`. See the [CLI](/using/cli/#backend) for more on the `backend` command.

## Connecting

The web client connects to the backend over the WebSocket API. On the connection screen, set:

- **Host**: the hostname or IP address of the machine running System Bridge (pre-filled with `0.0.0.0`).
- **Port**: the backend port (default `9170`).
- **Use SSL**: enable if the backend is served over HTTPS.
- **API Token**: your System Bridge token.

You need your token to connect. See [how to find your token](/running/#token).

:::tip
When the backend opens the web client for you, the host, port, and token are filled in automatically.
:::

## What you can do

### Data

View real-time data from every [data module](/api/websocket/data/), including CPU, memory, disks, displays, GPUs, media, networks, processes, sensors, and system information.

### Settings

Configure the backend without editing files:

- **General**: core application settings.
- **Media Directories**: folders exposed to the media source.
- **Commands**: allowlisted commands the backend can run.
- **Disks**: disk and filesystem options.

### Actions

Trigger actions on the machine running System Bridge:

- **Notifications**: send a system notification.
- **Open**: open a path or URL with the default application.
- **Media Controls**: control currently playing media.

## Next steps

- Connect programmatically with the [API and WebSocket](/api/).
- Prefer the terminal? Use the [TUI](/using/tui/) or [CLI](/using/cli/).
