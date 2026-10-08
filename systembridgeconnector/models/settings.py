"""System."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4


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
    workingDir: str = ""  # noqa: N815  # pylint: disable=invalid-name
    arguments: list[str] = field(default_factory=list)


@dataclass
class SettingsCommands:
    """Settings Commands."""

    allowlist: list[SettingsCommandDefinition] = field(default_factory=list)


@dataclass
class Settings:
    """Settings."""

    api: SettingsAPI = field(default_factory=SettingsAPI)
    autostart: bool = field(default=False)
    keyboard_hotkeys: list[SettingHotkey] = field(default_factory=list)
    log_level: str = field(default="INFO")
    media: SettingsMedia = field(default_factory=SettingsMedia)
    commands: SettingsCommands = field(default_factory=SettingsCommands)
