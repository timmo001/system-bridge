# System Bridge for Omarchy

An Omarchy bar widget and panel for System Bridge. It shows CPU and memory
usage in the bar. The panel has an overview of the system and a view for every
module the web client has a page for, with audio, Bluetooth, desktop, Discord,
display and media controls.

## Requirements

- Omarchy Quattro
- [System Bridge installed](https://system-bridge.timmo.dev/install/) with the
  `system-bridge` executable available on `PATH`, in a version with the
  `client audio`, `client bluetooth`, `client command`, `client desktop`,
  `client discord`, `client display`, `client hyprland`, `client media`,
  `client open --path` and `client quit --yes` commands
- A running local System Bridge service

## Install

Review the repository, then add the plugin:

```bash
omarchy plugin add https://github.com/timmo001/omarchy-system-bridge.git
```

Accept the prompt to enable the plugin during installation.

For an unattended install from a repository you already trust:

```bash
omarchy plugin add \
  https://github.com/timmo001/omarchy-system-bridge.git \
  --enable --yes
```

## Use

Select the widget to open its panel. It starts on the overview, grouped like
the web client: system, hardware, storage and network, and apps. Each module
shows up once, with its live readings where it has them, such as CPU, memory,
GPU, temperature, battery and disk meters, network traffic and what's playing.

Select a reading or a module to open its view. Each view has the module's
readings, and links to the matching part of the web client for anything you
set up there, such as commands, disk mounts, media directories or Discord. The
Bluetooth view connects or disconnects a paired device when you select it; the
desktop view focuses a window or workspace when you select it, switches the
keyboard layout, and reloads Hyprland's config; the Discord view has mute,
deafen and leave call; the displays view has brightness for each display that
supports it; and the media view has previous, play or pause, and next.

Select a section heading to collapse or expand it. Collapsed sections stay
collapsed until you expand them again or the shell restarts, and filtering
shows every match whether its section is collapsed or not.

Type to filter the rows, use Up and Down to move through them, and press Enter
to select one. Backspace or the back button returns to the overview, and Escape
clears the filter or closes the panel.

The header has two buttons: one opens the current view in the web client, and
the other quits System Bridge straight away. While
disconnected, the quit button starts System Bridge with
`system-bridge backend`.

The plugin has no System Bridge settings of its own. Change those in the web
client.

The plugin exposes the `timmo.system-bridge` shell IPC target with `open`,
`close`, `show`, `hide`, and `toggle` methods:

```bash
omarchy-shell shell toggle timmo.system-bridge
```

## Settings

- `primaryOnly`: show the widget only on the selected output
- `primaryOutput`: optional output name used when `primaryOnly` is enabled;
  the first available output is used when this is empty or unavailable

## Update

Review and apply the next fast-forward update:

```bash
omarchy plugin update timmo.system-bridge
```

## Remove

```bash
omarchy plugin remove timmo.system-bridge
```

## Validate from source

```bash
omarchy plugin validate .
```

## Security

This plugin runs unsandboxed inside `omarchy-shell` when enabled. Review its
source before installing it.

The plugin starts one long-running local data process, which watches every
System Bridge module:

```text
system-bridge client data watch --module desktop --module system ...
```

It reads System Bridge settings and its local authentication token through the
System Bridge client. Its buttons run `system-bridge client` commands to open
the web client, control Bluetooth devices, the desktop, Discord, displays and
media, run your allowlisted commands, and quit or start System Bridge. The
System view lists those commands, read with
`system-bridge client command list --json` every minute, and selecting one runs
it with `system-bridge client command run`.
