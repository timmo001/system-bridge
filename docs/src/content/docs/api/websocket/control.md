---
title: Control
description: Control media, Discord, displays, windows and workspaces, send notifications, open files and URLs, and change the power state or profile over the WebSocket API.
---

Control playback, Discord, displays, windows and workspaces, send notifications, open files and URLs, and manage the system's power state and profile.

## Media control

Send the `MEDIA_CONTROL` event with an `action` to control media playback. It controls the player the [`media`](/api/data/#media) data describes, unless you set `player` to another player's `id` from its `players`.

Available actions:

- `PLAY`
- `PAUSE`
- `STOP`
- `NEXT`
- `PREVIOUS`
- `VOLUME_UP`, `VOLUME_DOWN`: change the player's volume by 5%.
- `MUTE`: set the player's volume to 0, or back to where it was when it's already muted.
- `SEEK`: set `position` to the seconds from the start of the track. Check `is_seek_enabled` first.
- `SET_VOLUME`: set `volume` to 0-1.
- `SET_SHUFFLE`: set `shuffle` to `true` or `false`.
- `SET_REPEAT`: set `repeat` to `NONE`, `TRACK` or `LIST`.

On Windows, only the actions up to `MUTE` work, and not with `player`. System Bridge presses the media keys there, so the actions reach whichever app responds to them.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "MEDIA_CONTROL",
    "data": {
        "action": "PAUSE"
    }
}
```

```json title="Seek a particular player"
{
    "id": "abc123",
    "token": "abc123",
    "event": "MEDIA_CONTROL",
    "data": {
        "action": "SEEK",
        "player": "vlc",
        "position": 90
    }
}
```

## Discord control

Send the `DISCORD_CONTROL` event with an `action` to join or leave voice channels, open a text channel, toggle your camera or screenshare, play a soundboard sound, or change your Discord voice settings. Discord must be [set up](/features/discord/) first.

Available actions:

- `JOIN_VOICE_CHANNEL`: set `channel_id` to a voice channel's ID. If you're already in a voice channel, this moves you.
- `LEAVE_VOICE_CHANNEL`
- `OPEN_TEXT_CHANNEL`: set `channel_id` to a text channel's ID to show it in Discord. Discord refuses forum channels.
- `MUTE`, `UNMUTE`, `TOGGLE_MUTE`
- `DEAFEN`, `UNDEAFEN`, `TOGGLE_DEAFEN`
- `SET_INPUT_VOLUME`: set `value` to 0-100.
- `SET_INPUT_DEVICE`: set `device_id` to a device `id` from `input.devices` in the [`discord`](/api/data/#discord) data.
- `SET_OUTPUT_VOLUME`: set `value` to 0-200.
- `SET_OUTPUT_DEVICE`: set `device_id` to a device `id` from `output.devices`.
- `SET_VOICE_MODE`: set `mode` to `VOICE_ACTIVITY` or `PUSH_TO_TALK`.
- `SET_VOICE_THRESHOLD`: set `value` to the voice activity sensitivity, -100 to 0 dB.
- `SET_PUSH_TO_TALK_DELAY`: set `value` to the push to talk release delay, 0-2000 milliseconds.
- `ENABLE_QOS`, `DISABLE_QOS`, `TOGGLE_QOS`
- `ENABLE_SILENCE_WARNING`, `DISABLE_SILENCE_WARNING`, `TOGGLE_SILENCE_WARNING`
- `MUTE_USER`, `UNMUTE_USER`, `TOGGLE_USER_MUTE`: set `user_id` to a user's ID. This mutes them for you only. `TOGGLE_USER_MUTE` needs the user to be in your call.
- `SET_USER_VOLUME`: set `user_id`, and set `value` to 0-200. This changes their volume for you only.
- `TOGGLE_VIDEO`: turn your camera on or off.
- `TOGGLE_SCREENSHARE`: start or stop sharing your screen. Starting opens Discord's source picker, so pick a screen or window to share.
- `PLAY_SOUND`: set `sound_id` to a sound `id` from `sounds` in the [`discord`](/api/data/#discord) data. You must be in a call. Discord may refuse a sound from a server other than the one you're in.

The volume values are the percentages that Discord's sliders show. In testing, Discord ignored changes to automatic sensitivity, noise suppression, echo cancellation and automatic gain control made over RPC, so those settings are only available as data.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "DISCORD_CONTROL",
    "data": {
        "action": "SET_INPUT_VOLUME",
        "value": 80
    }
}
```

The response type is `DISCORD_CONTROLLED`. If Discord is not connected, the response is an `ERROR`.

## Audio control

Send the `AUDIO_CONTROL` event to set an audio output's, input's or app's volume or mute state, to make an output or input the default, or to move an app to another output. Set any of them together. See [audio](/features/remote-control/#audio) for what's supported.

- `id` (required): An `id` from the [`audio`](/api/data/#audio) data's `outputs`, `inputs` or `apps`.
- `volume` (optional): Volume in percent, 0-100.
- `muted` (optional): `true` to mute, `false` to unmute.
- `default` (optional): `true` to make it the default output or input.
- `output` (optional): An output's `id`, to move an app's sound to it. Linux only.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "AUDIO_CONTROL",
    "data": {
        "id": "alsa_output.pci-0000_00_1f.3.analog-stereo",
        "volume": 40,
        "muted": false
    }
}
```

The response type is `AUDIO_CONTROLLED`, and the audio module updates straight after. An unknown `id`, or something that doesn't apply to it, such as making an app the default, gets an `ERROR` with the subtype `BAD_REQUEST`. A platform that can't control audio gets `INVALID_ACTION`.

## Bluetooth control

Connect, disconnect or forget a paired device, and turn Bluetooth on or off. Addresses are the device `address`es from the [`bluetooth`](/api/data/#bluetooth) data. See [Bluetooth](/features/remote-control/#bluetooth) for what each platform supports.

| Event | Data | Response |
| --- | --- | --- |
| `BLUETOOTH_CONNECT` | `address` | `BLUETOOTH_CONNECTED` |
| `BLUETOOTH_DISCONNECT` | `address` | `BLUETOOTH_DISCONNECTED` |
| `BLUETOOTH_FORGET` | `address` | `BLUETOOTH_FORGOTTEN` |
| `BLUETOOTH_SET_POWER` | `powered`, `true` or `false` | `BLUETOOTH_POWER_SET` |

Forgetting a device unpairs it, so it has to be paired again before it can connect.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "BLUETOOTH_CONNECT",
    "data": {
        "address": "80:C3:BA:7B:93:4E"
    }
}
```

The response comes once the device has connected, which can take up to 30 seconds, and the bluetooth module updates straight after. An unknown address gets an `ERROR` with the subtype `BAD_REQUEST`, and something the platform can't do gets `INVALID_ACTION`.

## System control

Change system settings. Linux only.

| Event | Data | Response |
| --- | --- | --- |
| `SYSTEM_SET_POWER_PROFILE` | `profile`, one of the [`system`](/api/data/#system) data's `power_profiles` | `SYSTEM_POWER_PROFILE_SET` |
| `SYSTEM_SET_KEEP_AWAKE` | `enabled`, `true` or `false`, and optionally `duration` in seconds | `SYSTEM_KEEP_AWAKE_SET` |

Switching the power profile needs power-profiles-daemon, or tuned-ppd on Fedora.

Keeping awake stops the system idling, so it doesn't lock, blank the screen or sleep for being left alone. With a `duration`, it lets the system idle again after that many seconds. On Omarchy it turns on the bar's stay awake switch. Elsewhere it holds a logind idle inhibitor, which most desktops and idle daemons, such as hypridle, follow, until it's turned off or System Bridge stops.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "SYSTEM_SET_POWER_PROFILE",
    "data": {
        "profile": "performance"
    }
}
```

The system module updates straight after. A profile that isn't in `power_profiles` gets an `ERROR`.

## Desktop control

Focus, close and change windows, show a workspace, and switch the keyboard layout. Window and workspace IDs are the `id`s from the [`desktop`](/api/data/#desktop) data. See [desktop](/features/remote-control/#desktop) for what each desktop supports.

| Event | Data | Response |
| --- | --- | --- |
| `DESKTOP_CLOSE_WINDOW` | `id` | `DESKTOP_WINDOW_CLOSED` |
| `DESKTOP_FOCUS_WINDOW` | `id` | `DESKTOP_WINDOW_FOCUSED` |
| `DESKTOP_FOCUS_WORKSPACE` | `id` | `DESKTOP_WORKSPACE_FOCUSED` |
| `DESKTOP_SET_KEYBOARD_LAYOUT` | `layout`, one of the keyboard's `layouts` | `DESKTOP_KEYBOARD_LAYOUT_SET` |
| `DESKTOP_SET_WINDOW_STATE` | `id`, and any of `fullscreen`, `maximised` and `minimised` as `true` or `false` | `DESKTOP_WINDOW_STATE_SET` |

Closing a window asks it to close, as its close button does, so an app may ask to save first.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "DESKTOP_SET_WINDOW_STATE",
    "data": {
        "id": "0x555dbf21c9e0",
        "fullscreen": true
    }
}
```

The desktop module updates straight after. An unknown window, workspace or layout gets an `ERROR` with the subtype `BAD_REQUEST`, and something the desktop can't do gets `INVALID_ACTION`.

## Display control

Send the `DISPLAY_CONTROL` event to set a display's brightness, its power state, or both. See [displays](/features/remote-control/#displays) for what's supported.

- `id` (required): The display's `id` from the [`displays`](/api/data/#displays) data.
- `brightness` (optional): Brightness in percent, 0-100.
- `power_state` (optional): `on`, `standby`, `suspend` or `off`. External monitors only, except on Hyprland, which turns any display on or off.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "DISPLAY_CONTROL",
    "data": {
        "id": "HDMI-A-2",
        "brightness": 40
    }
}
```

The response type is `DISPLAY_CONTROLLED`, and the displays module updates straight after. A display that can't be controlled that way gets an `ERROR` with the subtype `INVALID_ACTION`.

## Hyprland control

On Hyprland, float, pin, move, resize and kill windows, rename workspaces and move them between displays, run dispatchers on the focused window, trigger global shortcuts, switch the submap, set some config options, and reload the config. Anywhere else these get an `ERROR` with the subtype `INVALID_ACTION`.

| Event | Data | Response |
| --- | --- | --- |
| `HYPRLAND_DISPATCH` | `dispatcher`, a `direction` for `move_focus` and `swap_window`, and optionally the `id` of a window to run it on | `HYPRLAND_DISPATCHED` |
| `HYPRLAND_KILL_WINDOW` | `id` | `HYPRLAND_WINDOW_KILLED` |
| `HYPRLAND_MOVE_WINDOW` | `id`, and the `workspace` to move it to | `HYPRLAND_WINDOW_MOVED` |
| `HYPRLAND_MOVE_WORKSPACE` | `id`, a workspace `id`, and the `display` to move it to, from the [`displays`](/api/data/#displays) data | `HYPRLAND_WORKSPACE_MOVED` |
| `HYPRLAND_RELOAD_CONFIG` | None | `HYPRLAND_CONFIG_RELOADED` |
| `HYPRLAND_RENAME_WORKSPACE` | `id`, a workspace `id`, and its new `name`, or none for the default | `HYPRLAND_WORKSPACE_RENAMED` |
| `HYPRLAND_RUN_GLOBAL_SHORTCUT` | `name`, from the `global_shortcuts` in the [`desktop`](/api/data/#desktop) data's `hyprland` | `HYPRLAND_GLOBAL_SHORTCUT_RUN` |
| `HYPRLAND_SET_OPTION` | `name`, an option from the `options` in the [`desktop`](/api/data/#desktop) data's `hyprland`, and its `value` | `HYPRLAND_OPTION_SET` |
| `HYPRLAND_SET_SUBMAP` | `name`, a submap the `binds` in the [`desktop`](/api/data/#desktop) data's `hyprland` are in, or none for the default | `HYPRLAND_SUBMAP_SET` |
| `HYPRLAND_SET_WINDOW` | `id`, and any of `floating` and `pinned` as `true` or `false`, `x` and `y`, and `width` and `height` | `HYPRLAND_WINDOW_SET` |

Moving a window leaves the focus where it is. Hyprland only pins floating windows, so pinning a tiled window floats it first, and tiling a pinned window unpins it. `x` and `y` place the window's top-left corner in pixels across every display, and `width` and `height` size it, each as a pair. Hyprland only places a floating window exactly, so float it in the same request. Killing a window ends its app without asking, unlike `DESKTOP_CLOSE_WINDOW`, so anything unsaved is lost. Only the global shortcuts apps have registered, the dispatchers below and the options listed in `options` can run or change, and there's no way to send Hyprland any other command.

The options are `animations.enabled`, `decoration.blur.enabled`, `decoration.dim_inactive`, `decoration.rounding`, `decoration.shadow.enabled`, `general.border_size`, `general.gaps_in`, `general.gaps_out`, `input.touchpad.natural_scroll` and `misc.vrr`. Each has a `type`: `bool` takes `true` or `false`, and `int` a whole number, 0 or more. A value set this way lasts until Hyprland's config reloads.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "HYPRLAND_SET_OPTION",
    "data": {
        "name": "animations.enabled",
        "value": false
    }
}
```

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "HYPRLAND_RUN_GLOBAL_SHORTCUT",
    "data": {
        "name": "omarchy:panel.omarchy.clock"
    }
}
```

The dispatchers act on the focused window, as their binds would. With an `id`, that window is focused first:

| Dispatcher | Effect |
| --- | --- |
| `center_window` | Center the window. Floating windows only. |
| `cycle_next_window` | Focus the next window on the workspace. |
| `cycle_previous_window` | Focus the previous window on the workspace. |
| `group_next` | Show the next window in the window's group. |
| `group_previous` | Show the previous window in the window's group. |
| `lock_group` | Lock the window's group, so windows can't be moved in or out. |
| `lock_groups` | Lock every group. |
| `move_focus` | Move the focus to the window in a `direction`. |
| `swap_window` | Swap the window with the one in a `direction`. |
| `toggle_group` | Turn the window into a group, or break up its group. |
| `toggle_split` | Switch the split the window is in between horizontal and vertical, in the dwindle layout. |
| `unlock_group` | Unlock the window's group. |
| `unlock_groups` | Unlock every group. |

The direction is `down`, `left`, `right` or `up`. When Hyprland refuses, such as centring a tiled window, you get an `ERROR` with its reason.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "HYPRLAND_DISPATCH",
    "data": {
        "dispatcher": "move_focus",
        "direction": "left"
    }
}
```

## Omarchy control

While the Omarchy shell runs, open, close or toggle its menu and the panels of its plugins. Otherwise these get an `ERROR` with the subtype `INVALID_ACTION`.

| Event | Data | Response |
| --- | --- | --- |
| `OMARCHY_MENU` | `action`, and the `id` of a menu to open or toggle | `OMARCHY_MENU_CHANGED` |
| `OMARCHY_PANEL` | `action` and the `id` of a panel | `OMARCHY_PANEL_CHANGED` |

The action is `open`, `close` or `toggle`. The ids are in the [`desktop`](/api/data/#desktop) data's `omarchy`. A menu also opens by one of its `aliases`, so `capture` opens `trigger.capture`. An id the shell doesn't have gets an `ERROR` with the subtype `BAD_REQUEST`.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "OMARCHY_PANEL",
    "data": {
        "action": "toggle",
        "id": "omarchy.audio"
    }
}
```

## Send notification

Send the `NOTIFICATION` event to show a desktop notification. `title` and `message` are required; the rest are optional.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "NOTIFICATION",
    "data": {
        "title": "Hello",
        "message": "World"
    }
}
```

Available fields:

- `title` (required): The notification title.
- `message` (required): The notification body.
- `icon` (optional): The icon name.
- `duration` (optional): How long to show the notification, in milliseconds.
- `actionUrl` (optional): A URL to open when the notification is clicked.
- `actionPath` (optional): A file or folder path to open when the notification is clicked.
- `sound` (optional): Path to a sound file to play with the notification.

## Open a path

Send the `OPEN` event with a `path` to open a file or folder with the default application.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "OPEN",
    "data": {
        "path": "C:\\users\\user\\Downloads\\example.txt"
    }
}
```

## Open a URL

Send the `OPEN` event with a `url` to open it in the default browser.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "OPEN",
    "data": {
        "url": "https://timmo.dev"
    }
}
```

## Process control

Send the `PROCESS_KILL` event to end a process. It's asked to stop, as closing it would, unless you `force` it.

- `id` (required): The process's `id` from the [`processes`](/api/data/#processes) data.
- `force` (optional): `true` to end it straight away, losing anything unsaved.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "PROCESS_KILL",
    "data": {
        "id": 12345
    }
}
```

The response type is `PROCESS_KILLED`, and the processes module updates straight after. A process that doesn't exist, or System Bridge itself, gets an `ERROR` with the subtype `BAD_REQUEST`, and one the backend's user isn't allowed to end gets an `ERROR` with the system's reason.

## Power control

Control the system power state with one of the following events. Each takes empty `data`.

- `POWER_HIBERNATE`
- `POWER_LOCK`
- `POWER_LOGOUT`
- `POWER_RESTART`
- `POWER_SHUTDOWN`
- `POWER_SLEEP`

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "POWER_SLEEP",
    "data": {}
}
```
