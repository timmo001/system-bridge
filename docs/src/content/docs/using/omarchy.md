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
the panel. Click a reading or press Enter to run its configured action.
Readings without an action remain informational.

The plugin exposes the `timmo.system-bridge` shell IPC target:

```bash
omarchy-shell timmo.system-bridge toggle
```

## Settings

- `primaryOnly`: show the widget only on the selected output
- `primaryOutput`: optional output name used when `primaryOnly` is enabled;
  the first available output is used when this is empty or unavailable
- `itemActions`: map of reading keys to commands, with each command written as
  an array containing the executable followed by its arguments; defaults to `{}`

### Item actions

Set actions on the `timmo.system-bridge` entry in `shell.json`, or use
`omarchy bar set`. Replace the repository label and absolute directory below
with your chosen repository:

```bash
omarchy bar set timmo.system-bridge itemActions '{
  "cpu": ["dot", "herdr", "repo-open", "<repository-label>", "<repository-directory>", "Btop", "btop"],
  "memory": ["dot", "herdr", "repo-open", "<repository-label>", "<repository-directory>", "Btop", "btop"],
  "uptime": ["notify-send", "System Bridge", "Uptime selected"]
}' --json
```

This replaces the complete action map. Use `{}` to clear all actions:

```bash
omarchy bar set timmo.system-bridge itemActions '{}' --json
```

Available keys are `cpu`, `memory`, `load`, `cpu-temperature`, `hottest-sensor`,
`disk-root`, `uptime`, and `pending-reboot`. Individual fans use `fan-<key>`
with their System Bridge `key`; GPUs use `gpu-<id>` with their System Bridge
`id`. GPUs without an ID use their zero-based array index, which depends on
device ordering. Actions apply only to readings present in the panel.

Arguments are literal, including spaces and shell metacharacters. Use an
absolute repository directory; `~` and environment variables are not expanded
in arguments. Invoke a shell explicitly when needed, for example
`["bash", "-lc", "your shell command"]`.

The CPU and memory examples use the existing
[`dot herdr repo-open`](https://dotfiles.timmo.dev/dot/commands/) command to
launch `btop`. They require `dot`, a running shared Herdr server, and `btop`
available in the target shell. Herdr opens or focuses the repository workspace
and runs the final command argument in its shell. Each activation opens a new
command tab, using the initial tab when creating a workspace. The uptime
example instead sends a desktop notification through `notify-send`.

For dotfiles-managed configuration, put the map in `settings.itemActions` or
the relevant host settings in the private `omarchy-plugins.json`, then run
`dot stow`. A private plugin entry replaces the matching public entry, so retain
its placement and other settings. Keep personal repository labels and paths in
that private configuration.

Omitted keys, `null`, and empty arrays leave readings without actions. Malformed
maps and commands, non-string arguments, and blank executable names are ignored.
Valid actions close the panel before launching and run detached; the panel does
not report completion or exit status.

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
local settings and authentication token through that client. Configured item
actions launch additional local processes with the user's permissions. What
those commands do depends on the actions you configure.
