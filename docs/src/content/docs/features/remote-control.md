---
title: Remote control
description: Open URLs and files, type and press keys, control windows, set audio volumes and display brightness, and sleep, lock or shut down the machine running System Bridge.
---

System Bridge can act on the machine it runs on: open a website or file, type text or press keys, focus and arrange windows, set an audio device's volume, set a display's brightness, and change its power state. Home Assistant automations use these to, for example, open a dashboard on a wall display in the morning or lock the computer when you leave.

## Opening a URL or file

### In the web client

1. Open the **System** page in the [web client](/using/web-client/) and scroll to **Open**.
2. Choose **URL** or **Path**.
3. Enter a URL, such as `https://example.com`, or a path to a file or folder on that machine.
4. Select **Open**.

A URL opens in the default browser. A file opens in the app it's set to open with, and a folder opens in the file manager. A path that doesn't exist shows an error, rather than nothing happening.

### Elsewhere

- **Home Assistant**: the integration has actions to open a URL or a path. See [Home Assistant](/using/home-assistant/#actions).
- **API**: send [`OPEN`](/api/websocket/control/#open-a-path) with a `url` or a `path`.

## Typing and pressing keys

Home Assistant and the API can type text and press keys, as if on the machine's own keyboard. They go to whichever window has focus.

- Type text with [`KEYBOARD_TEXT`](/api/websocket/input/#keyboard-text), such as a search or a message.
- Press a key with [`KEYBOARD_KEYPRESS`](/api/websocket/input/#keyboard-keypress), optionally holding `shift`, `ctrl`, `alt` or `cmd`. For example, `space` with no modifiers to pause a video, or `l` with `ctrl` to focus a browser's address bar.

Both take an optional `delay` in milliseconds before they start, which helps when something else has to open first.

## Power

Sleep, hibernate, lock, log out, restart or shut down the machine from Home Assistant or the [API](/api/websocket/control/#power-control). System Bridge doesn't ask for confirmation, so these happen straight away.

| Action | Linux | Windows |
| --- | --- | --- |
| Sleep | `systemctl suspend` | Sleeps, turning hibernation off first so it doesn't hibernate instead |
| Hibernate | `systemctl hibernate` | Hibernates, turning hibernation on first |
| Lock | `loginctl lock-session` | Locks the workstation |
| Log out | Ends your login session | `shutdown /l` |
| Restart | `systemctl reboot` | `shutdown /r` |
| Shut down | `systemctl poweroff` | `shutdown /s` |

On Linux, hibernating needs swap set up for it. Depending on your distribution's polkit rules, suspending or shutting down may ask for a password when System Bridge runs as a service.

## Audio

Set an output's or input's volume, mute or unmute it, or make it the default, from the [web client](/using/web-client/)'s **Audio** page, the API with [`AUDIO_CONTROL`](/api/websocket/control/#audio-control), the [MCP server](/api/mcp/)'s `system_bridge_audio_control` tool, or the CLI:

```bash title="Terminal"
system-bridge client audio alsa_output.pci-0000_00_1f.3.analog-stereo --volume 40
system-bridge client audio alsa_output.pci-0000_00_1f.3.analog-stereo --mute
system-bridge client audio alsa_output.pci-0000_00_1f.3.analog-stereo --default
```

The id is the device's `id` from the [`audio`](/api/data/#audio) data, which reports each device's `volume`, `muted` and `default`.

- **Linux** uses `pactl`, so it needs PulseAudio or PipeWire with `pipewire-pulse`.
- **Windows** uses the system's audio endpoints.

macOS isn't supported yet, so it reports no devices.

Changes made elsewhere, such as with your volume keys or another mixer, show up straight away on Linux and within a second on Windows.

## Bluetooth

Connect, disconnect or forget paired devices, and turn Bluetooth on or off, from the [web client](/using/web-client/)'s **Bluetooth** page, the API with [Bluetooth control](/api/websocket/control/#bluetooth-control), the [MCP server](/api/mcp/)'s `system_bridge_bluetooth_*` tools, or the CLI:

```bash title="Terminal"
system-bridge client bluetooth connect 80:C3:BA:7B:93:4E
system-bridge client bluetooth disconnect 80:C3:BA:7B:93:4E
system-bridge client bluetooth forget 80:C3:BA:7B:93:4E
system-bridge client bluetooth power off
```

The address is the device's `address` from the [`bluetooth`](/api/data/#bluetooth) data, which also reports whether Bluetooth is `powered`. Pairing a new device isn't supported, as it usually needs a code confirmed on both sides.

| Action | Linux | Windows |
| --- | --- | --- |
| Connect or disconnect a device | Yes | No |
| Forget a device | Yes | Yes |
| Turn Bluetooth on or off | Yes | No |

Linux uses BlueZ, and turning Bluetooth on or off applies to every adapter. macOS isn't supported yet.

## Desktop

Focus, close, maximise and make windows fullscreen, show a workspace and switch the keyboard layout from the [web client](/using/web-client/)'s **Desktop** page, the API with [desktop control](/api/websocket/control/#desktop-control), the [MCP server](/api/mcp/)'s `system_bridge_desktop_*` tools, or the CLI:

```bash title="Terminal"
system-bridge client desktop focus 0x555dbf21c9e0
system-bridge client desktop state 0x555dbf21c9e0 --fullscreen
system-bridge client desktop close 0x555dbf21c9e0
system-bridge client desktop workspace 2
system-bridge client desktop layout us
```

The ids are the window and workspace `id`s from the [`desktop`](/api/data/#desktop) data.

| Action | Hyprland | Other Wayland desktops | Windows |
| --- | --- | --- | --- |
| Focus or close a window | Yes | Yes | Yes |
| Fullscreen | Yes | Yes | No |
| Maximise | Yes | Yes | Yes |
| Minimise | No | Yes | Yes |
| Show a workspace | Yes | Yes | No |
| Switch keyboard layout | Yes | No | Yes |

### Hyprland

On Hyprland you can also float, pin and move windows, move the focus and run other dispatchers on the focused window, trigger the global shortcuts apps have registered, and reload the config, from the same places or the CLI:

```bash title="Terminal"
system-bridge client hyprland set 0x555dbf21c9e0 --floating --pinned
system-bridge client hyprland move 0x555dbf21c9e0 2
system-bridge client hyprland dispatch move_focus left
system-bridge client hyprland shortcut omarchy:panel.omarchy.clock
system-bridge client hyprland reload
```

System Bridge only runs these actions and [dispatchers](/api/websocket/control/#hyprland-control). It can't send Hyprland any other command.

### Omarchy

While the Omarchy shell runs, open, close or toggle its menu at any of its routes, and the panels of its plugins, from the same places or the CLI:

```bash title="Terminal"
system-bridge client omarchy menu open capture
system-bridge client omarchy menu close
system-bridge client omarchy panel toggle omarchy.audio
```

The menus, panels and the shell's IPC targets are in the [`desktop`](/api/data/#desktop) data's `omarchy`. To call other IPC functions, add them to your [commands](/features/commands/).

## Displays

Set a display's brightness, or turn a monitor off and on, from the API with [`DISPLAY_CONTROL`](/api/websocket/control/#display-control), the [MCP server](/api/mcp/)'s `system_bridge_display_control` tool, or the CLI:

```bash title="Terminal"
system-bridge client display HDMI-A-2 --brightness 40
system-bridge client display HDMI-A-2 --power off
```

The [`displays`](/api/data/#displays) data reports each display's `brightness` and `power_state`.

- **External monitors** are controlled over DDC/CI, which most monitors support, though some turn it off by default in their own menu. On Linux this needs [ddcutil](https://www.ddcutil.com/), and access to `/dev/i2c-*`, usually by being in the `i2c` group. On Windows it works through the monitor's driver.
- **Built-in laptop panels** use their backlight for brightness. On Linux, System Bridge sets the backlight through logind, so it needs to run in, or as the user of, an active login session.
- **On Hyprland**, displays without DDC/CI, built-in panels included, are turned on and off with Hyprland's DPMS. It only has `on` and `off`, so `standby` and `suspend` turn the display off.

Not every monitor answers DDC/CI. Outside Hyprland, those report `null`, and controlling them returns an error. macOS isn't supported yet.

## Processes

End a process from the [`processes`](/api/data/#processes) data with [`PROCESS_KILL`](/api/websocket/control/#process-control), the [MCP server](/api/mcp/)'s `system_bridge_kill_process` tool, or the CLI:

```bash title="Terminal"
system-bridge client process kill 12345
system-bridge client process kill 12345 --force
```

A process is asked to stop, as closing it would, so it can save first. `--force` ends it straight away. System Bridge can only end processes its own user may, and won't end itself.

## Security

Anyone with your API token can do all of this, including shutting the machine down. Keep the token private, and see [privacy and security](/privacy/).
