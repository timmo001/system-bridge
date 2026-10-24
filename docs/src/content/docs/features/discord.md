---
title: Discord
description: See and change your Discord voice settings and call from System Bridge.
---

System Bridge connects to the Discord desktop app on the same machine. It shows your voice state and call, and lets you mute, deafen, change your audio devices and volumes, adjust other people's volume, and play soundboard sounds from the web client or the API.

Discord only lets apps you own read and change your voice settings, so you set it up once with your own Discord application.

## Setting it up

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create an application. Any name works.
2. On its **OAuth2** page, copy the **Client ID** and **Client Secret**.
3. On the same page, add `http://localhost` as a redirect and save.
4. In the [web client](/using/web-client/), open the **Discord** page and scroll to **Setup**. Enter the client ID and secret, then select **Save and connect**.
5. Make sure the Discord desktop app is open. Discord shows a prompt asking to let System Bridge in. Approve it with the account that owns the application.

**Setup** shows each step as it happens: the application saved, Discord running, connected, and signed in. Once you're signed in, your Discord status and the controls appear above it.

The client secret is stored only on that machine, in `discord.json`, readable only by your user. It's never shown again or sent back to a client. To change the application, enter the new client ID and secret and select **Save and reconnect**. Discord asks you to approve the new one.

### Without the web client

Send [`UPDATE_DISCORD_SETUP`](/api/websocket/system/#discord-setup) with the client ID and secret, or create `discord.json` in the [settings directory](/running/#file-locations) yourself:

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET"
}
```

System Bridge checks for the file every 30 seconds.

## Using it

The **Discord** page shows your status and call first, then the controls.

- **Voice**: mute, deafen, turn your camera on or off, share your screen, and leave the call. Mute and deafen are highlighted while they're on. Video and screen share need you to be in a call. Starting a screen share opens Discord's picker, so choose what to share there.
- **Audio**: pick your input and output devices, and set their volumes. Volumes match Discord's sliders: 0-100% for input and 0-200% for output.
- **Voice settings**: switch between voice activity and push to talk, and set the voice activity sensitivity or the push to talk release delay. While automatic sensitivity is on in Discord, Discord sets the sensitivity itself. Turn quality of service and the silence warning on or off.
- **In the call**: mute anyone in your call, or change their volume, for you only.
- **Soundboard**: play any sound you can use. Sounds play in your call, so you need to be in one.

A slider sends its value when you let go. If Discord refuses a change, the control goes back to how Discord has it, and the page says what went wrong.

Some settings, such as noise suppression and echo cancellation, are shown but can't be changed: Discord ignores changes to them from other apps.

### From your own code

- The [`discord`](/api/data/#discord) data module has everything the page shows, and updates as soon as anything changes in Discord.
- [`DISCORD_CONTROL`](/api/websocket/control/#discord-control) does everything the controls do, and can also join a voice channel or open a text channel by its ID.

For example, a script on a desk button could toggle deafen, or mute you when a meeting starts.

## Troubleshooting

**Setup** in the web client shows where it stopped and any problem Discord reports.

| What you see | What to do |
| --- | --- |
| **Discord running** isn't done | Open the Discord desktop app on the same machine, signed in. The web version of Discord can't be reached. |
| "The client ID should be the long number from the OAuth2 page" | Copy the **Client ID** again from the application's **OAuth2** page. |
| "Invalid Client ID" | Discord doesn't recognise the application. Check you copied the client ID from the right application. |
| **Signed in** never finishes | Check Discord for the prompt, and approve it with the account that owns the application. Check `http://localhost` is saved as a redirect. |
| You declined the prompt, or it timed out | System Bridge asks again after 5 minutes. To try straight away, select **Save and reconnect**. |

To sign in again from scratch, delete `discord-token.json` from the [settings directory](/running/#file-locations). Discord also asks again when a System Bridge update needs new permissions. The [privacy page](/privacy/#discord-permissions) lists each permission and what it's used for.
