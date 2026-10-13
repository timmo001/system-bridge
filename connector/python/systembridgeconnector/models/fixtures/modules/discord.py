"""Test fixtures for the discord module."""

from systembridgeconnector.models.modules.discord import (
    Discord,
    DiscordAudio,
    DiscordCall,
    DiscordCallMember,
    DiscordChannel,
    DiscordDevice,
    DiscordServer,
    DiscordSound,
    DiscordUser,
    DiscordVoiceConnection,
    DiscordVoiceMode,
    DiscordVoiceProcessing,
)

FIXTURE_DISCORD = Discord(
    connected=True,
    authenticated=True,
    user=DiscordUser(
        id="1",
        username="username",
        global_name="Global Name",
        avatar_url="https://cdn.discordapp.com/avatars/1/avatar.png",
    ),
    call=DiscordCall(
        channel=DiscordChannel(
            id="2",
            name="General",
            type="GUILD_VOICE",
            bitrate=64000,
            user_limit=10,
        ),
        server=DiscordServer(
            id="3",
            name="Server",
            icon_url="https://cdn.discordapp.com/icons/3/icon.png",
        ),
        connection=DiscordVoiceConnection(
            state="VOICE_CONNECTED",
            last_ping=20.0,
            average_ping=25.5,
        ),
        me=DiscordCallMember(
            user=DiscordUser(id="1", username="username"),
            nick="Nick",
            server_mute=False,
            server_deaf=False,
            suppress=False,
            speaking=True,
        ),
        members=[
            DiscordCallMember(
                user=DiscordUser(id="1", username="username"),
                nick="Nick",
                server_mute=False,
                server_deaf=False,
                suppress=False,
                speaking=True,
            ),
            DiscordCallMember(
                user=DiscordUser(id="4", username="friend"),
                server_mute=False,
                server_deaf=False,
                self_mute=True,
                suppress=False,
                speaking=False,
                local_mute=False,
                volume=80.0,
            ),
        ],
    ),
    mute=False,
    deaf=False,
    input=DiscordAudio(
        volume=100.0,
        device_id="default",
        devices=[DiscordDevice(id="default", name="Default")],
    ),
    output=DiscordAudio(
        volume=150.0,
        device_id="default",
        devices=[DiscordDevice(id="default", name="Default")],
    ),
    mode=DiscordVoiceMode(
        type="VOICE_ACTIVITY",
        auto_threshold=True,
        threshold=-60.0,
        delay=20.0,
    ),
    processing=DiscordVoiceProcessing(
        noise_suppression=True,
        echo_cancellation=True,
        automatic_gain_control=False,
    ),
    qos=True,
    silence_warning=True,
    video=False,
    screenshare=True,
    sounds=[
        DiscordSound(id="1", name="quack", emoji="🦆"),
        DiscordSound(
            id="10",
            name="Listen",
            server_id="3",
            emoji_url="https://cdn.discordapp.com/emojis/4.png",
        ),
    ],
)
