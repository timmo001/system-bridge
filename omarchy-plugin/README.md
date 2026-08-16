# System Bridge for Omarchy

An Omarchy bar widget and panel for local System Bridge health data. It shows
CPU and memory usage in the bar, with disk, fan, GPU, temperature, uptime, and
reboot details in a keyboard-filterable panel.

## Requirements

- Omarchy Quattro
- System Bridge installed with the `system-bridge` executable available on
  `PATH`
- A running local System Bridge service

## Install

Review the repository, then add the plugin:

```bash
omarchy plugin add https://github.com/timmo001/omarchy-system-bridge.git
```

Accept the prompt to enable the plugin during installation.

For an unattended install from a repository you already trust:

```bash
omarchy plugin add https://github.com/timmo001/omarchy-system-bridge.git --enable --yes
```

## Use

Select the widget to open its panel. Type to filter the available readings,
use Up and Down to move through the list, and press Escape to clear the filter
or close the panel.

The plugin exposes the `timmo.system-bridge` shell IPC target with `open`,
`close`, `show`, `hide`, and `toggle` methods:

```bash
omarchy-shell timmo.system-bridge toggle
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

The plugin starts one long-running local process:

```text
system-bridge client data watch --module cpu --module memory --module disks --module sensors --module gpus --module system --module battery
```

It reads System Bridge settings and its local authentication token through the
System Bridge client. It does not write Omarchy configuration, access remote
services directly, run privileged commands, or install software.
