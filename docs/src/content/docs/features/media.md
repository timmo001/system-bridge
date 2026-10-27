---
title: Media
description: See and control what's playing, and share your media folders with Home Assistant and other clients.
---

System Bridge shows what's playing on your machine, lets you control it, and shares folders of media so other clients can browse and play them.

## What's playing

The `media` module reports the title, artist, album, artwork, position, length, volume, shuffle and repeat of what's playing.

| Platform | Where it comes from |
| --- | --- |
| Linux | Any player that supports MPRIS, such as Spotify, VLC, mpv and most browsers. System Bridge reads them over D-Bus, so nothing needs installing. |
| Windows | The current Windows media session, read by the `NowPlaying` helper that comes with System Bridge. |

With several players open on Linux, System Bridge shows the first one playing, then the first one paused, preferring one with a track loaded.

## Controlling playback

### In the web client

Open the **Media** page in the [web client](/using/web-client/). The player at the top shows what's playing, with:

- Previous, play or pause, and next in the middle.
- Stop on the left.
- The volume on the right. Hover over it, or focus it with the keyboard, to show volume down, mute and volume up. On a touch screen they're always shown.

A button is greyed out when the player says it can't do that, such as skipping on the last track.

### Elsewhere

- **Home Assistant**: the integration's media player shows and controls what's playing, for machines running Windows. See [Home Assistant](/using/home-assistant/#media-player).
- **API**: send [`MEDIA_CONTROL`](/api/websocket/control/#media-control) with `PLAY`, `PAUSE`, `STOP`, `NEXT`, `PREVIOUS`, `VOLUME_UP`, `VOLUME_DOWN` or `MUTE`.
- **Agents**: the [MCP server](/api/mcp/)'s `system_bridge_media_control` tool takes the same actions.

### How each platform controls it

| Platform | How |
| --- | --- |
| Linux | System Bridge controls the player the Media module shows over MPRIS. Volume up and down change its volume by 5%. Mute sets it to 0, or back to where it was when it's already muted. Some players, such as Chromium, ignore volume changes. |
| Windows | System Bridge presses the media keys, so it controls whichever app responds to them. |

## Sharing media folders

Media directories are folders you share with clients that browse files, such as the Home Assistant [media source](/using/home-assistant/#media-source). Your documents, downloads, home, music, pictures and videos folders are always shared. Add others for things like a recordings folder or a second drive.

1. In the web client, open the **Media** page and scroll to **Media directories**.
2. Under **Add a directory**, enter a **Name**, such as "Recordings", and the folder's **Path**. The folder must already exist.
3. Select **Add**.

To stop sharing a folder, select the bin button next to it.

Clients list a shared folder's files with [`GET_FILES`](/api/websocket/system/#list-files), and download them from [`/api/media/file/data`](/api/media-file-data/). Only common image, audio, video and document types up to 100 MB can be downloaded, and only from inside a shared folder.
