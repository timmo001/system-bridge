---
title: Notifications
description: Show desktop notifications on the machine running System Bridge from the web client, the terminal, Home Assistant or the API.
---

System Bridge shows notifications through your desktop's own notifications, so they look and behave like any other app's. Use them for things like a backup finishing, a door opening, or a reminder to take a break.

## Sending one

### In the web client

1. Open the **System** page in the [web client](/using/web-client/) and scroll to **Notifications**.
2. Enter a **Title** and **Message**.
3. Optionally add:
   - **Icon**: the path to an image on that machine.
   - **Link**: a URL to open when the notification is clicked.
   - **Sound**: the path to a sound file on that machine.
4. Select **Send**. **Clear** empties the form.

### From the terminal

```bash
system-bridge client notification --title "Backup finished" --message "All files were copied"
```

The [CLI](/using/cli/#notification) also takes `--icon`, `--sound`, `--action-url` and `--action-path`.

### From Home Assistant

The integration can send notifications to your machine, so an automation can tell you when something happens at home. See [Home Assistant](/using/home-assistant/#notifications) and the [integration's documentation](https://www.home-assistant.io/integrations/system_bridge) for the action to use.

### From your own code or an agent

- Send [`NOTIFICATION`](/api/websocket/control/#send-notification) over the WebSocket. It also takes a `duration` in milliseconds and an `actionPath` to open a file or folder when clicked.
- Agents can use the [MCP server](/api/mcp/)'s `system_bridge_send_notification` tool.

## What each platform supports

| | Linux | Windows |
| --- | --- | --- |
| Title and message | Yes | Yes |
| Icon | An icon name, such as `dialog-information`, or a path to an image | A path to an image |
| Duration | Shown for the time you set, if your notification daemon allows it | Short, or long from 7 seconds |
| Open a link or path when clicked | Yes | No |
| Sound | Played with `paplay` or `aplay` | Windows plays its own notification sound |

On Linux, notifications need a notification daemon, which most desktops include.
