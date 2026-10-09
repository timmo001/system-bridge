"""System."""

from dataclasses import dataclass, field
from enum import Enum
from typing import cast
from uuid import uuid4

from .helpers import filter_unexpected_fields


def generate_token() -> str:
    """Generate token."""
    return str(uuid4())


class SettingAPIEnum(Enum):
    """Setting API Enum."""

    TOKEN = "token"
    PORT = "port"


class SettingHotkeyEnum(Enum):
    """Setting Hotkey Enum."""

    NAME = "name"
    KEY = "key"


class SettingDirectoryEnum(Enum):
    """Setting Media Directory Enum."""

    NAME = "name"
    PATH = "path"


class SettingMediaEnum(Enum):
    """Setting Media Enum."""

    DIRECTORIES = "directories"


class SettingEnum(Enum):
    """Setting Enum."""

    API = "api"
    AUTOSTART = "autostart"
    KEYBOARD_HOTKEYS = "keyboard_hotkeys"
    LOG_LEVEL = "log_level"
    MEDIA = "media"


@dataclass
class SettingsAPI:
    """Settings API."""

    token: str = field(default_factory=generate_token)
    port: int = field(default=9170)


@dataclass
class SettingHotkey:
    """Setting Hotkey."""

    name: str
    key: str


@dataclass
class SettingDirectory:
    """Setting Directory."""

    name: str
    path: str


@dataclass
class SettingsMedia:
    """Settings Media."""

    directories: list[SettingDirectory] = field(default_factory=list)


@dataclass
class SettingsCommandDefinition:
    """Settings Command Definition."""

    id: str
    name: str
    command: str
    workingDir: str = ""  # noqa: N815
    arguments: list[str] = field(default_factory=list)


@dataclass
class SettingsCommands:
    """Settings Commands."""

    allowlist: list[SettingsCommandDefinition] = field(default_factory=list)


@dataclass
class SettingsDisks:
    """Settings Disks."""

    allowedSecondaryMountPoints: list[str] = field(default_factory=list)  # noqa: N815


@filter_unexpected_fields
@dataclass
class Settings:
    """Settings, matching the backend's GET_SETTINGS and UPDATE_SETTINGS data."""

    autostart: bool = field(default=False)
    systemTray: bool = field(default=True)  # noqa: N815
    hotkeys: list[SettingHotkey] = field(default_factory=list)
    logLevel: str = field(default="WARN")  # noqa: N815
    commands: SettingsCommands = field(default_factory=SettingsCommands)
    disks: SettingsDisks = field(default_factory=SettingsDisks)
    media: SettingsMedia = field(default_factory=SettingsMedia)

    def __post_init__(self) -> None:
        """Post Init."""
        self.hotkeys = [
            SettingHotkey(**cast(dict, h)) if isinstance(h, dict) else h
            for h in self.hotkeys or []
        ]

        if isinstance(self.commands, dict):
            self.commands = SettingsCommands(
                allowlist=[
                    SettingsCommandDefinition(**command)
                    for command in self.commands.get("allowlist") or []
                ]
            )

        if isinstance(self.disks, dict):
            self.disks = SettingsDisks(**self.disks)

        if isinstance(self.media, dict):
            self.media = SettingsMedia(
                directories=[
                    SettingDirectory(**directory)
                    for directory in self.media.get("directories") or []
                ]
            )
