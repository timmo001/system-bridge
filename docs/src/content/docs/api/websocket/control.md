---
title: Control
description: Control media, Discord and displays, send notifications, open files and URLs, and change the power state over the WebSocket API.
---

Control playback, Discord and displays, send notifications, open files and URLs, and manage system power state.

## Media control

Send the `MEDIA_CONTROL` event with an `action` to control media playback.

Available actions:

- `PLAY`
- `PAUSE`
- `STOP`
- `NEXT`
- `PREVIOUS`
- `VOLUME_UP`
- `VOLUME_DOWN`
- `MUTE`

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

Send the `AUDIO_CONTROL` event to set an audio output's or input's volume or mute state, or to make it the default. Set any of them together. See [audio](/features/remote-control/#audio) for what's supported.

- `id` (required): The device's `id` from the [`audio`](/api/data/#audio) data's `outputs` or `inputs`.
- `volume` (optional): Volume in percent, 0-100.
- `muted` (optional): `true` to mute, `false` to unmute.
- `default` (optional): `true` to make it the default output or input.

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

The response type is `AUDIO_CONTROLLED`, and the audio module updates straight after. An unknown `id` gets an `ERROR` with the subtype `BAD_REQUEST`, and a platform that can't control audio gets `INVALID_ACTION`.

## Display control

Send the `DISPLAY_CONTROL` event to set a display's brightness, its power state, or both. See [displays](/features/remote-control/#displays) for what's supported.

- `id` (required): The display's `id` from the [`displays`](/api/data/#displays) data.
- `brightness` (optional): Brightness in percent, 0-100.
- `power_state` (optional): `on`, `standby`, `suspend` or `off`. External monitors only.

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
