---
title: Control
---

Control playback, send notifications, open files and URLs, and manage system power state.

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
