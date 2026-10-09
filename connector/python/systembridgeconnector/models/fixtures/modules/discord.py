"""Test fixtures for the discord module."""

from systembridgeconnector.models.modules.discord import (
    Discord,
    DiscordAudio,
    DiscordCall,
    DiscordCallMember,
    DiscordChannel,
    DiscordDevice,
    DiscordServer,
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
            nick="Nick",
            server_mute=False,
            server_deaf=False,
            suppress=False,
            speaking=True,
        ),
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
)
