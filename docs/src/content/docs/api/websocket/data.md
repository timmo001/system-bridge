---
title: Data
description: Request module data, subscribe to live updates, and handle the data messages over the WebSocket API.
---

Request system data on demand, subscribe to live updates, and handle the messages the backend sends back.

## Requesting data

To request data, send a message with the `GET_DATA` event listing each module to receive data from.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DATA",
    "data": {
        "modules": ["system"]
    }
}
```

## Registering as a listener

To receive data whenever it changes, send the `REGISTER_DATA_LISTENER` event with each module you want to subscribe to.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "REGISTER_DATA_LISTENER",
    "data": { "modules": ["cpu", "memory", "system"] }
}
```

The backend replies with a `DATA_LISTENER_REGISTERED` response, then sends a [`DATA_UPDATE`](#receiving-data) message whenever a subscribed module changes.

Most modules refresh once a minute. These also update as soon as something changes on the system:

| Module | Updates when | Platforms |
| --- | --- | --- |
| `audio` | An output or input's volume, mute or default changes | Linux, Windows |
| `battery` | The charger is plugged in or removed, or a battery's charge or state changes | Linux, Windows |
| `bluetooth` | A device is paired, removed, connected, disconnected or renamed | Linux, Windows |
| `cameras` | A camera is connected or removed | Linux |
| `discord` | Anything changes in Discord | All |
| `displays` | A display is connected or removed. On Linux, also when a built-in panel's brightness changes | Linux, Windows |
| `media` | The track or playback state changes | Linux |
| `networks` | An interface comes up or goes down, gains or loses an address, or joins or leaves a Wi-Fi network | Linux, Windows |
| `system` | The session is locked or unlocked, the user goes away (a minute without input) or comes back, or a systemd unit fails or recovers (Linux) | Linux, Windows |

Readings such as CPU, memory and network traffic are measurements, so they follow the refresh.

To stop receiving updates, send the `UNREGISTER_DATA_LISTENER` event. It takes no data and responds with the `DATA_LISTENER_UNREGISTERED` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "UNREGISTER_DATA_LISTENER",
    "data": {}
}
```

## Receiving data

After a `GET_DATA` request or while registered as a listener, you receive messages with the `DATA_UPDATE` type.

This will look something like this:

```json title="Response"
{
    "id": "abc123",
    "type": "DATA_UPDATE",
    "subtype": "NONE",
    "data": {
        "boot_time": 1651433957.3015134,
        "fqdn": "Desktop",
        "hostname": "Desktop",
        "ip_address_4": "1.1.1.1",
        "mac_address": "aa:bb:cc:dd:ee:ff",
        "platform": "Windows",
        "platform_version": "10.0.22000",
        "uptime": 7.015625,
        "uuid": "abcd-efgh-abcd-efgh-abcd",
        "version": "5.0.2",
        "version_latest": "5.0.7",
        "version_newer_available": false
    },
    "message": "Data received",
    "module": "system"
}
```

## Hyprland events

While registered as a listener for the `desktop` module on Hyprland, you also receive each custom event Hyprland sends. A bind sends one with Hyprland's event dispatcher, so a key can trigger an automation:

```lua title="hyprland.lua"
hl.bind("SUPER + F12", hl.dsp.event("dock"))
```

With a classic config, bind to `event, dock`, or send one from a script with `hyprctl dispatch event dock`. A client can send one with [`HYPRLAND_SEND_EVENT`](/api/websocket/control/#hyprland-control). Each arrives with the `HYPRLAND_EVENT` type, and `data` is what the bind passed:

```json title="Response"
{
    "id": "system",
    "type": "HYPRLAND_EVENT",
    "subtype": "NONE",
    "data": { "data": "dock" },
    "module": "desktop"
}
```

The TypeScript connector has them as the `hyprlandEvents` stream, and the Python connector passes them to `listen()`'s `hyprland_event_callback`.

## Getting history

System Bridge keeps up to the last 24 hours of the graphed readings and keeps them through restarts. It records about one a minute of each:

- CPU usage, temperature, frequency, power and load average
- Memory, swap and battery
- System power
- Network and disk rates, and each disk's temperature
- Each GPU's core and memory load, temperature and power
- Each temperature sensor and fan speed

Readings a system doesn't report are left out.

Send the `GET_HISTORY` event to get them. With no data it returns everything it holds. Both of these are optional:

- `since`, in Unix milliseconds, returns only readings taken after that time, such as the newest one you already have.
- `modules` returns only those modules' readings: `cpu`, `memory`, `battery`, `system`, `networks`, `disks`, `gpus` or `sensors`. The other series come back as empty lists. Any other module is answered with a `BAD_REQUEST` error.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_HISTORY",
    "data": { "since": 1761300000000, "modules": ["cpu", "gpus"] }
}
```

It responds with the `HISTORY` type. Each series is a list of readings, oldest first, with `time` in Unix milliseconds. Usage and loads are percentages, temperatures are in °C, frequency is in MHz, power is in watts and fan speeds are in RPM. Network and disk values are rates in bytes per second. Disks are listed by name, and sensors and fans by their key.

```json title="Response"
{
    "id": "abc123",
    "type": "HISTORY",
    "subtype": "NONE",
    "data": {
        "cpu": [
            { "time": 1761300060000, "value": 12.5 },
            { "time": 1761300120000, "value": 18.2 }
        ],
        "cpu_temperature": [{ "time": 1761300060000, "value": 61 }],
        "cpu_frequency": [{ "time": 1761300060000, "value": 4850 }],
        "cpu_power": [{ "time": 1761300060000, "value": 65.2 }],
        "load_average": [{ "time": 1761300060000, "value": 1.8 }],
        "memory": [{ "time": 1761300060000, "value": 48.1 }],
        "swap": [],
        "battery": [],
        "system_power": [],
        "network_receive": [{ "time": 1761300060000, "value": 20480 }],
        "network_send": [{ "time": 1761300060000, "value": 5120 }],
        "disk_read": [],
        "disk_write": [],
        "disk_temperatures": [
            {
                "id": "nvme0n1",
                "samples": [{ "time": 1761300060000, "value": 42 }]
            }
        ],
        "gpus": [
            {
                "id": "gpu0",
                "core_load": [{ "time": 1761300060000, "value": 7 }],
                "memory_load": [{ "time": 1761300060000, "value": 31.5 }],
                "temperature": [{ "time": 1761300060000, "value": 48 }],
                "power": [{ "time": 1761300060000, "value": 21.4 }]
            }
        ],
        "temperatures": [],
        "fans": [
            {
                "id": "nct6799_fan2",
                "samples": [{ "time": 1761300060000, "value": 1180 }]
            }
        ]
    },
    "message": "Got history"
}
```

To save the history to a file, use [`system-bridge client history export`](/using/cli/#export-history) or the web client's Export menu, on the overview or a module's page. The TypeScript connector's `historyToCsv` and the Python connector's `MetricHistory.to_csv()` write the same CSV.

## Getting diagnostics

Send the `GET_DIAGNOSTICS` event, with no data, to see how the app is doing. It's meant for bug reports, so it holds no paths, names or command lines: settings are summarised as counts and switches, and errors have the home directory shown as `~` and the user name as `<user>`.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DIAGNOSTICS"
}
```

It responds with the `DIAGNOSTICS` type:

- `started_at` and every `last_error_at` and `time` are in Unix seconds.
- `modules` lists each data module. `updated` is when it last succeeded, in RFC 3339, or `null` if it never has. `failures` counts the failed updates in a row and goes back to 0 on a success, while `last_error` stays until the next failure.
- `settings` is `null` when the settings can't be read.
- `recent_errors` holds up to the last 20 warnings and errors from the log, oldest first.

```json title="Response"
{
    "id": "abc123",
    "type": "DIAGNOSTICS",
    "subtype": "NONE",
    "data": {
        "version": "5.24.0",
        "platform": "linux",
        "architecture": "amd64",
        "started_at": 1761300000,
        "log_level": "INFO",
        "modules": [
            {
                "name": "cpu",
                "has_data": true,
                "updated": "2025-10-24T10:01:00Z",
                "failures": 0,
                "last_error": null,
                "last_error_at": null
            },
            {
                "name": "gpus",
                "has_data": false,
                "updated": null,
                "failures": 3,
                "last_error": "failed to get GPU info",
                "last_error_at": 1761300060
            }
        ],
        "settings": {
            "autostart": false,
            "system_tray": true,
            "hotkeys": 0,
            "commands": 2,
            "media_directories": 1,
            "allowed_secondary_mount_points": 0,
            "cameras_capture": false,
            "desktop_window_titles": false,
            "desktop_hyprland_code": false
        },
        "recent_errors": [
            {
                "time": 1761300060,
                "level": "WARN",
                "message": "Task processing error for module",
                "error": "failed to get GPU info",
                "module": "gpus",
                "event": null
            }
        ]
    },
    "message": "Got diagnostics"
}
```

The [`system-bridge client diagnostics`](/using/cli/#diagnostics) command prints the same, and the connectors have it as `getDiagnostics` in TypeScript and `get_diagnostics()` in Python.
