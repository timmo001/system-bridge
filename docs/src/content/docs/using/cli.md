---
title: CLI
---

The System Bridge CLI provides commands to interact with the System Bridge backend. Most commands live under the `system-bridge client` subcommand, while `backend`, `tui` and `version` are top-level commands.

## Token

The token is essential to connect to the API/WebSocket. To get it, run the following command:

```bash
system-bridge client token
```

:::note
The token is stored per user, so run this command as the same user that runs the backend. If you run System Bridge as a system service under root, switch to that user first:

```bash
sudo su -
system-bridge client token
```

You can also use the short form `system-bridge c t`.
:::

Alternatively, you can find your token in the application startup logs when running the backend. The logs will show "Your API token is" followed by your token value.

## Notification

To send a notification, use the following command:

```bash
system-bridge client notification --title "Title" --message "Message" --icon "icon-name"
```

Available flags:

- `--title`: The title of the notification (default: "System Bridge")
- `--message`: The message of the notification (default: "Hello, world!")
- `--icon`: The icon of the notification (default: "system-bridge")
- `--sound`: Path to a sound file to play with the notification (Linux only)
- `--action-url`: URL to open when the notification is clicked (Linux only)
- `--action-path`: File/folder path to open when the notification is clicked (Linux only)

## Discovery

### List Services

To list discovered services on the network, run:

```bash
system-bridge client discovery list
```

This will scan for available System Bridge instances and display them with their hostname, IP, port, and type.

## Data

### List Modules

To list all available data modules, run:

```bash
system-bridge client data list
```

By default, this outputs as a simple list. You can also use:

```bash
system-bridge client data list --json
```

To output as a JSON array.

Available flags:

- `--json`: Output as a JSON array
- `--table`: Output as a table (default)

### Run Modules

To run a specific data module and get its data as JSON, use:

```bash
system-bridge client data run --module cpu
```

For example, to get CPU data:

```bash
system-bridge client data run --module cpu
```

To run all modules and get a JSON object with all data:

```bash
system-bridge client data run --all
```

To pretty-print the JSON output:

```bash
system-bridge client data run --module cpu --pretty
```

Available flags:

- `--module` or `-m`: Module name (e.g., cpu, memory)
- `--all`: Run all modules
- `--pretty`: Pretty-print JSON output

## Backend

To run the backend server, use:

```bash
system-bridge backend
```

Add `--open-web-client` to open the [web client](/using/web-client/) once the backend has started:

```bash
system-bridge backend --open-web-client
```

See [Running](/running/) for autostart and service setup.

## Version

To get the version of System Bridge, run:

```bash
system-bridge version
```

## Next steps

- Prefer a graphical interface? Use the [web client](/using/web-client/).
- Prefer an interactive menu? Use the [TUI](/using/tui/).
- Connect to the [API and WebSocket](/api/) to read data and control your system.
- Integrate with [Home Assistant](/using/home-assistant/).
- Not started the backend yet? See [Running](/running/).
