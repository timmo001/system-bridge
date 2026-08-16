---
title: Omarchy
description: Show local System Bridge health in the Omarchy bar and panel.
---

The System Bridge Omarchy plugin shows CPU and memory usage in the bar. Select
the widget to open a panel with disk, fan, GPU, temperature, uptime, and reboot
details.

## Requirements

- Omarchy Quattro
- System Bridge installed with the `system-bridge` executable available on
  `PATH`
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

Select the widget to open its panel. Type to filter the readings, use Up and
Down to move through the list, and press Escape to clear the filter or close
the panel.

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
local settings and authentication token through that client. It does not write
Omarchy configuration, access remote services directly, run privileged
commands, or install software.
