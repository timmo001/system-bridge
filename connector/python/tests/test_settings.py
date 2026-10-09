"""Test the settings model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.settings import (
    Settings,
    SettingsAPI,
    SettingsCommandDefinition,
    SettingsCommands,
)


def test_settings(snapshot: SnapshotAssertion):
    """Test the settings."""
    settings = Settings(
        api=SettingsAPI(
            token="token",
        ),
    )
    assert isinstance(settings, Settings)
    assert settings == snapshot


def test_settings_token():
    """Test the settings token."""
    settings = Settings()
    assert settings.api.token != ""


def test_settings_command_definition(snapshot: SnapshotAssertion):
    """Test the settings command definition."""
    command_def = SettingsCommandDefinition(
        id="test-command-id",
        name="Test Command",
        command="/usr/bin/test",
        workingDir="/tmp",  # noqa: S108
        arguments=["arg1", "arg2"],
    )
    assert isinstance(command_def, SettingsCommandDefinition)
    assert command_def.id == "test-command-id"
    assert command_def.name == "Test Command"
    assert command_def.command == "/usr/bin/test"
    assert command_def.workingDir == "/tmp"  # noqa: S108
    assert command_def.arguments == ["arg1", "arg2"]
    assert command_def == snapshot


def test_settings_command_definition_defaults(snapshot: SnapshotAssertion):
    """Test the settings command definition with defaults."""
    command_def = SettingsCommandDefinition(
        id="test-command-id",
        name="Test Command",
        command="/usr/bin/test",
    )
    assert isinstance(command_def, SettingsCommandDefinition)
    assert command_def.workingDir == ""
    assert command_def.arguments == []
    assert command_def == snapshot


def test_settings_commands(snapshot: SnapshotAssertion):
    """Test the settings commands."""
    commands = SettingsCommands(
        allowlist=[
            SettingsCommandDefinition(
                id="test-command-id",
                name="Test Command",
                command="/usr/bin/test",
            ),
        ],
    )
    assert isinstance(commands, SettingsCommands)
    assert len(commands.allowlist) == 1
    assert commands.allowlist[0].id == "test-command-id"
    assert commands == snapshot


def test_settings_commands_empty(snapshot: SnapshotAssertion):
    """Test the settings commands with empty allowlist."""
    commands = SettingsCommands()
    assert isinstance(commands, SettingsCommands)
    assert commands.allowlist == []
    assert commands == snapshot


def test_settings_with_commands(snapshot: SnapshotAssertion):
    """Test settings with commands."""
    settings = Settings(
        api=SettingsAPI(token="token"),
        commands=SettingsCommands(
            allowlist=[
                SettingsCommandDefinition(
                    id="test-command-id",
                    name="Test Command",
                    command="/usr/bin/test",
                ),
            ],
        ),
    )
    assert isinstance(settings, Settings)
    assert isinstance(settings.commands, SettingsCommands)
    assert len(settings.commands.allowlist) == 1
    assert settings == snapshot
