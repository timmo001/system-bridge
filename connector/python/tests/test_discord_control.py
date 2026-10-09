"""Test the discord_control model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.discord_control import DiscordAction, DiscordControl


def test_discord_control(snapshot: SnapshotAssertion):
    """Test the discord_control."""
    discord_control = DiscordControl(
        action=DiscordAction.SET_INPUT_VOLUME,
        value=50.0,
    )
    assert isinstance(discord_control, DiscordControl)
    assert discord_control == snapshot
