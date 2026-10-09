---
title: Control
---

Control playback and Discord, send notifications, open files and URLs, and manage system power state.

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

Send the `DISCORD_CONTROL` event with an `action` to change your Discord voice settings. Discord must be [set up](/running/#discord) first.

Available actions:

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
