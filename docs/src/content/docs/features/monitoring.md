---
title: Monitoring
description: Watch CPU, memory, disks, networks, media and more on the web client, Home Assistant, the terminal or the API.
---

System Bridge reads your system's state into data modules and keeps them up to date. Every way of using System Bridge reads the same modules, so pick whichever suits you.

## What it reports

| Module | What's in it |
| --- | --- |
| `system` | Hostname, platform, uptime, signed-in users, versions, and which apps are using the camera or microphone. |
| `processes` | Running processes with their CPU and memory use. |
| `cpu` | Usage, frequency, temperature, power and each core's load. |
| `memory` | Physical memory and swap. |
| `gpus` | Load, memory, clocks, temperature and power for each GPU. |
| `sensors` | Temperatures and fan speeds. |
| `battery` | Charge, whether it's charging, and time remaining. |
| `displays` | Resolution, position, refresh rate, brightness and power state of each display. |
| `audio` | Output and input devices, their volume, whether they're muted and which are the defaults. |
| `disks` | Partitions, used and free space, and read and write activity. |
| `networks` | Interfaces, addresses, traffic and connections. |
| `media` | What's playing and its position. |
| `discord` | Your Discord voice state and call, once [Discord](/features/discord/) is set up. |

System Bridge updates most modules about once a minute. Discord pushes its changes as they happen. The [data reference](/api/data/) lists every field.

## In the web client

The [web client](/using/web-client/) has a page for each module, grouped in the menu into **System**, **Hardware**, **Storage and network** and **Apps**.

- The **Overview** shows gauges for CPU, memory, GPU, CPU temperature and battery, graphs of CPU, memory and network use, storage, and what's playing. Select a card to open its module.
- Each module's page has a dashboard of cards and graphs. Graphs start with the first readings after you open the page.
- Processes and network connections are in tables you can search, sort and page through. The search, sort and page are kept in the address, so a reload or a shared link shows the same rows.
- Select **JSON** at the top of a module's page to see its raw data, as an app or script would get it.

### Choosing which disks to show

The Disks module always reports your primary mounts. Bind mounts, such as btrfs subvolumes, and squashfs mounts, such as snaps, are left out unless you pick them. On the **Disks** page, under **Disk mounts**, tick the mounts you want reported. Each change saves straight away.

## In Home Assistant

The [Home Assistant integration](/using/home-assistant/) turns the modules into sensors, such as CPU usage, memory used, disk space and battery level. Use them in dashboards, history graphs and automations, for example to notify you when a disk is nearly full.

## From the terminal

Print a module's current data as JSON:

```bash
system-bridge client data run --module cpu --pretty
```

Pick out one value with `jq`:

```bash
system-bridge client data run --module memory | jq '.virtual.percent'
```

Stream updates from the running backend, one JSON line per update:

```bash
system-bridge client data watch --module cpu --module memory
```

See the [CLI](/using/cli/#data) for every option.

## From your own code

- Fetch a module over HTTP from [`/api/data/{module}`](/api/data/).
- Get a module, or subscribe to its updates, over the [WebSocket](/api/websocket/data/).
- Let an agent read modules with the [MCP server](/api/mcp/)'s `system_bridge_get_data` tool.
