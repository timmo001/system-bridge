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

With several players open on Linux, System Bridge shows the first one playing, then the first one paused, preferring one with a track loaded. It also lists every player in `players`, so clients can show and control the others.

## Controlling playback

### In the web client

Open the **Media** page in the [web client](/using/web-client/). The player at the top shows what's playing, with:

- Previous, play or pause, and next in the middle.
- Stop on the left, with shuffle and repeat beside it when the player has them. Repeat moves from off to all to one.
- The volume on the right. Hover over it, or focus it with the keyboard, to show volume down, mute and volume up. On a touch screen they're always shown.
- The position, which you can drag to seek when the player supports it.

A button is greyed out when the player says it can't do that, such as skipping on the last track.

On Linux, with more than one player open, a picker at the top of the player chooses which one it shows and controls. **Automatic** follows the one System Bridge picks, and your choice is kept in this browser. The other players sit below as smaller cards, each with play or pause and **Show** to pick it.

### Elsewhere

- **Home Assistant**: the integration's media player shows and controls what's playing, for machines running Windows. See [Home Assistant](/using/home-assistant/#media-player).
- **API**: send [`MEDIA_CONTROL`](/api/websocket/control/#media-control) with `PLAY`, `PAUSE`, `STOP`, `NEXT`, `PREVIOUS`, `VOLUME_UP`, `VOLUME_DOWN` or `MUTE`. On Linux, it also takes `SEEK`, `SET_VOLUME`, `SET_SHUFFLE` and `SET_REPEAT`, and a `player` to control a player other than the one shown.
- **Agents**: the [MCP server](/api/mcp/)'s `system_bridge_media_control` tool takes the same actions.
- **CLI**: `system-bridge client media pause`, or `system-bridge client media seek 90 --player vlc`.

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
