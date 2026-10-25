---
title: Omarchy
description: Show System Bridge in the Omarchy bar, with a panel for every module.
---

The System Bridge Omarchy plugin shows CPU and memory usage in the bar. Select
the widget to open a panel with an overview of the system and a view for every
module the web client has a page for, with audio, desktop, Discord, display and
media controls.

## Requirements

- Omarchy Quattro
- System Bridge installed with the `system-bridge` executable available on
  `PATH`, in a version with the `client audio`, `client bluetooth`,
  `client desktop`, `client discord`, `client display`, `client hyprland`,
  `client media`, `client open --path` and `client quit --yes`
  [CLI commands](/using/cli/)
- A running local System Bridge service

## Install

Review the plugin repository, then add it:

```bash
omarchy plugin add https://github.com/timmo001/omarchy-system-bridge.git
```

Accept the prompt to enable the plugin. For an unattended install from a
repository you already trust:

```bash
omarchy plugin add https://github.com/timmo001/omarchy-system-bridge.git --enable --yes
```

## Use

The panel starts on the overview: CPU, memory, GPU, CPU temperature and battery
meters, storage, network traffic, what's playing, and a row for each module.

Select a reading or a module to open its view. Each view has the module's
readings, and links to the matching part of the web client for anything you set
up there, such as commands, disk mounts, media directories or Discord. The
Bluetooth view connects or disconnects a paired device when you select it; the
desktop view focuses a window or workspace when you select it, switches the
keyboard layout, reloads Hyprland's config, and centres, groups or splits the
focused window or cycles to the next or previous one; the Discord view has mute,
deafen and leave call; the displays view has brightness for each display that
supports it; the media view has previous, play or pause, and next; and the
system view lists your [commands](/features/commands/), running one when you
select it.

Type to filter the rows, use Up and Down to move through them, and press Enter
to select one. Backspace or the back button returns to the overview, and Escape
clears the filter or closes the panel.

The header has two buttons: one opens the current view in the web client, and
the other quits System Bridge, or starts it while it's not running.

The plugin has no System Bridge settings of its own. Change those in the
[web client](/using/web-client/).

The plugin exposes the `timmo.system-bridge` shell IPC target:

```bash
omarchy-shell timmo.system-bridge toggle
```

## Settings

- `primaryOnly`: show the widget only on the selected output
- `primaryOutput`: optional output name used when `primaryOnly` is enabled;
  the first available output is used when this is empty or unavailable

## Update and remove

Review and apply the next fast-forward update:

```bash
omarchy plugin update timmo.system-bridge
```

Remove the plugin and its shell entry:

```bash
omarchy plugin remove timmo.system-bridge
```

## Security

Omarchy plugins run as unsandboxed code inside `omarchy-shell`. Review the
source before installing it.

This plugin starts `system-bridge client data watch` and reads System Bridge's
local settings and authentication token through that client. Its buttons run
`system-bridge client` commands to open the web client, control the desktop,
media, Discord and displays, run your allowlisted commands, and quit or start
System Bridge.
