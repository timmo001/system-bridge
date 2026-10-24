---
title: System
---

Browse the filesystem, read and update settings, run allowlisted commands, and shut down the backend.

## Files & directories

These events let you browse the base directories System Bridge exposes, list and inspect files within them, and validate paths.

The available base directory keys are `documents`, `downloads`, `home`, `music`, `pictures` and `videos`, plus any custom directories configured in `media.directories` in your [settings](#settings).

### List directories

Send the `GET_DIRECTORIES` event to list the available base directories. It takes no data and responds with the `DIRECTORIES` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DIRECTORIES",
    "data": {}
}
```

### Get a directory

Send the `GET_DIRECTORY` event with the base directory key to look up a single directory. It responds with the `DIRECTORY` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DIRECTORY",
    "data": {
        "base": "documents"
    }
}
```

### List files

Send the `GET_FILES` event with a base directory, and optionally a relative `path` within it, to list files. It responds with the `FILES` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_FILES",
    "data": {
        "base": "documents",
        "path": "subfolder"
    }
}
```

### Get a file

Send the `GET_FILE` event with the absolute `path` to a file to get its information. It responds with the `FILE` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_FILE",
    "data": {
        "path": "/home/user/Documents/example.txt"
    }
}
```

To read the contents of a media file, use the [Media File Data](/api/media-file-data/) HTTP endpoint instead.

### Validate a directory

Send the `VALIDATE_DIRECTORY` event with a `path` to check whether it exists and is a directory. It responds with the `DIRECTORY_VALIDATED` type and a `data.valid` boolean.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "VALIDATE_DIRECTORY",
    "data": {
        "path": "/home/user/Music"
    }
}
```

### Get disk mounts

Send the `GET_DISK_MOUNTS` event to list mounted disks, categorised into primary and secondary (bind and squashfs) mounts. It takes no data and responds with the `DISK_MOUNTS` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DISK_MOUNTS",
    "data": {}
}
```

## Settings

Read and update the backend settings over the WebSocket connection.

### Get settings

Send the `GET_SETTINGS` event to retrieve the current settings. It takes no data and responds with the `SETTINGS_RESULT` type.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_SETTINGS",
    "data": {}
}
```

### Update settings

Send the `UPDATE_SETTINGS` event with the settings object to update. It responds with the `SETTINGS_UPDATED` type and the updated settings.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "UPDATE_SETTINGS",
    "data": {
        "autostart": true,
        "logLevel": "INFO"
    }
}
```

### Settings keys

| Key | Type | Description |
| --- | --- | --- |
| `autostart` | boolean | Start the backend automatically when you log in. |
| `logLevel` | string | One of `DEBUG`, `INFO`, `WARN`, `ERROR`. Defaults to `WARN`. |
| `hotkeys` | array | List of `{ name, key }` hotkey bindings. |
| `commands.allowlist` | array | Commands that can be run via [Execute Command](#execute-command). Each entry is `{ id, name, command, workingDir, arguments }`. |
| `disks.allowedSecondaryMountPoints` | array | Secondary mount points to include in disk data. |
| `media.directories` | array | Custom media directories as `{ name, path }`, exposed as [base directories](#files--directories). |

:::note
Changing `autostart` or `logLevel` is applied immediately by the backend.
:::

## Discord setup

Read and save the Discord application System Bridge signs in with. See [Discord](/running/#discord) for creating the application.

### Get the Discord setup

Send the `GET_DISCORD_SETUP` event to see how far Discord is set up. It takes no data and responds with the `DISCORD_SETUP` type. The client secret is never sent back.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "GET_DISCORD_SETUP",
    "data": {}
}
```

```json title="Response data"
{
    "configured": true,
    "clientId": "123456789012345678",
    "redirectUri": "http://localhost",
    "running": true,
    "connected": true,
    "authenticated": false,
    "error": ""
}
```

| Key | Description |
| --- | --- |
| `configured` | Valid credentials are saved. |
| `clientId` | The saved client ID, or empty. |
| `redirectUri` | The redirect to add on the application's **OAuth2** page. |
| `running` | The Discord desktop app can be reached. |
| `connected` | System Bridge is connected to Discord. |
| `authenticated` | You've approved System Bridge in Discord. |
| `error` | Why the last attempt to connect or sign in failed, or empty. |

### Update the Discord setup

Send the `UPDATE_DISCORD_SETUP` event with the application's `clientId` and `clientSecret`. System Bridge saves them to `discord.json`, readable only by your user, then connects to Discord straight away. Changing the application drops the saved Discord token, so Discord asks you to approve it again. It responds with the `DISCORD_SETUP_UPDATED` type and the [setup](#get-the-discord-setup).

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "UPDATE_DISCORD_SETUP",
    "data": {
        "clientId": "123456789012345678",
        "clientSecret": "YOUR_CLIENT_SECRET"
    }
}
```

A client ID that isn't the long number from the **OAuth2** page, or a missing secret, returns an `ERROR` response with the `BAD_REQUEST` subtype.

## Execute command

Run a command from the allowlist defined in your [settings](#settings).

Send the `COMMAND_EXECUTE` event with the `commandID` of an allowlisted command:

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "COMMAND_EXECUTE",
    "data": {
        "commandID": "my-command"
    }
}
```

The command runs asynchronously. You receive a `COMMAND_EXECUTING` response immediately, followed by a `COMMAND_COMPLETED` response once it finishes.

:::caution
Only commands present in `commands.allowlist` can be executed. Requesting an unknown command returns an `ERROR` response with the `COMMAND_NOT_FOUND` subtype.
:::

## Exit application

Send the `EXIT_APPLICATION` event to shut down the backend. It takes empty `data`.

```json title="Request"
{
    "id": "abc123",
    "token": "abc123",
    "event": "EXIT_APPLICATION",
    "data": {}
}
```
