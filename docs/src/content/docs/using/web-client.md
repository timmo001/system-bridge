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

The web client connects to the backend over the WebSocket API. On the **Connection** page, set:

- **Host**: the hostname or IP address of the machine running System Bridge. It starts with the address you opened the web client from.
- **Port**: the backend port (default `9170`).
- **Use a secure connection**: turn on when the backend is served over HTTPS.
- **API token**: your System Bridge token.

You need your token to connect. See [how to find your token](/running/#token). The settings are kept in your browser.

:::tip
When the backend opens the web client for you, the host, port, and token are filled in automatically.
:::

## Getting around

The search box in the header lists every page, grouped into **System**, **Hardware**, **Storage and network**, **Apps** and **Settings**. Click it, or press **Ctrl+K** (**⌘K** on macOS), then type to filter and press **Enter** to go.

The chip next to it shows whether the web client is connected. Click it to open the **Connection** page.

Every page has its own address, so you can bookmark it, share it, or reload it and land back where you were. Pages that show tables keep their search, sorting and page in the address too. A section of a page, such as the commands on the System page, has its own link too.

| Page | Address |
| --- | --- |
| Overview | `/` |
| A data module | `/<module>`, such as `/cpu` |
| A module's raw data | `/<module>?view=json` |
| Commands | `/system#commands` |
| Notifications | `/system#notifications` |
| Open | `/system#open` |
| Disk mounts | `/disks#disk-mounts` |
| Media controls | `/media#media-controls` |
| Media directories | `/media#media-directories` |
| Discord controls | `/discord#discord-controls` |
| Discord setup | `/discord#discord-setup` |
| Settings | `/settings`, `/settings/appearance` |
| Connection | `/connection` |

Older addresses, such as `/data/cpu` or `/settings/commands`, take you to the new place.

## What you can do

### Overview

Live gauges for CPU, memory, GPU, CPU temperature and battery, graphs of CPU, memory and network use, storage, what's playing, and a shortcut to every module.

### Modules

Each [data module](/api/websocket/data/) has a page: system information, processes, CPU, memory, GPUs, sensors, battery, displays, disks, networks, media and Discord. Use the **Dashboard** and **JSON** chips at the top of the page to switch between the dashboard and the module's raw data.

Graphs start with the first readings after the page opens. System Bridge updates most data about once a minute.

Processes and network connections are in tables you can search, sort and page through.

The controls and settings for a module sit on its page, with its data:

- **System**: run and manage the commands clients can run, send a desktop notification, and open a URL in the browser, or a file or folder with its app.
- **Disks**: choose which extra mounts the Disks module reports.
- **Media**: control what's playing, and choose the folders exposed to the media source.
- **Discord**: mute, deafen, change your audio devices and volumes, voice mode, each call member's volume, and play soundboard sounds. The setup connects System Bridge to the Discord desktop app. See [Discord](/running/#discord).

### Settings

- **General**: start automatically, the system tray icon, and the log level. It also links to the settings kept on module pages.
- **Appearance**: themes. See [Appearance](#appearance).

## Appearance

The colour mode follows your device's light or dark setting by default. Switch between **System**, **Dark** and **Light** from the header.

On the **Appearance** page, pick one theme for dark and one for light. Themes are grouped by family. The web client includes System Bridge's own themes, Catppuccin (Frappé, Macchiato, Mocha and Latte), Tokyo Night (Night, Storm, Moon and Day), Rosé Pine (Main, Moon and Dawn), Midnight, Nord, Dracula, Gruvbox and Solarized.

Appearance settings are kept in your browser, so each browser can have its own.

## Next steps

- Connect programmatically with the [API and WebSocket](/api/).
- Prefer the terminal? Use the [CLI](/using/cli/).
