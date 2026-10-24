---
title: Remote control
description: Open URLs and files, type and press keys, set display brightness, and sleep, lock or shut down the machine running System Bridge.
---

System Bridge can act on the machine it runs on: open a website or file, type text or press keys, set a display's brightness, and change its power state. Home Assistant automations use these to, for example, open a dashboard on a wall display in the morning or lock the computer when you leave.

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

## Displays

Set a display's brightness, or turn a monitor off and on, from the API with [`DISPLAY_CONTROL`](/api/websocket/control/#display-control), the [MCP server](/api/mcp/)'s `system_bridge_display_control` tool, or the CLI:

```bash title="Terminal"
system-bridge client display HDMI-A-2 --brightness 40
system-bridge client display HDMI-A-2 --power off
```

The [`displays`](/api/data/#displays) data reports each display's `brightness` and `power_state`.

- **External monitors** are controlled over DDC/CI, which most monitors support, though some turn it off by default in their own menu. On Linux this needs [ddcutil](https://www.ddcutil.com/), and access to `/dev/i2c-*`, usually by being in the `i2c` group. On Windows it works through the monitor's driver.
- **Built-in laptop panels** use their backlight. They have brightness but no power state. On Linux, System Bridge sets the backlight through logind, so it needs to run in, or as the user of, an active login session.

Not every monitor answers DDC/CI. Those report `null`, and controlling them returns an error. macOS isn't supported yet.

## Security

Anyone with your API token can do all of this, including shutting the machine down. Keep the token private, and see [privacy and security](/privacy/).
