"""Test the discord module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.discord import FIXTURE_DISCORD
from systembridgeconnector.models.modules.discord import (
    Discord,
    DiscordAudio,
    DiscordCall,
    DiscordCallMember,
    DiscordChannel,
    DiscordDevice,
    DiscordNotification,
    DiscordSound,
    DiscordUser,
)


def test_discord(snapshot: SnapshotAssertion):
    """Test the discord model."""
    discord = FIXTURE_DISCORD
    assert isinstance(discord, Discord)
    assert discord == snapshot


def test_discord_dict():
    """Test the discord model converts nested dicts."""
    discord = Discord(**asdict(FIXTURE_DISCORD))
    assert discord == FIXTURE_DISCORD
    assert isinstance(discord.call, DiscordCall)
    assert isinstance(discord.call.channel, DiscordChannel)
    assert discord.call.members is not None
    assert isinstance(discord.call.members[1], DiscordCallMember)
    assert isinstance(discord.call.members[1].user, DiscordUser)
    assert isinstance(discord.input, DiscordAudio)
    assert discord.input.devices is not None
    assert isinstance(discord.input.devices[0], DiscordDevice)
    assert discord.sounds is not None
    assert isinstance(discord.sounds[0], DiscordSound)
    assert isinstance(discord.notification, DiscordNotification)


def test_discord_not_connected():
    """Test the discord model when Discord is not running."""
    discord = Discord(connected=False, authenticated=False, unknown_field="test")
    assert discord.connected is False
    assert discord.call is None
