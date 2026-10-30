"""Diagnostics."""

from dataclasses import dataclass
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class DiagnosticsModule:
    """How a data module's updates are going.

    updated is when it last succeeded, in RFC 3339, and failures counts the
    failed updates in a row. last_error has the home directory and user name
    masked, and last_error_at is in Unix seconds.
    """

    name: str
    has_data: bool
    updated: str | None
    failures: int
    last_error: str | None
    last_error_at: int | None


@filter_unexpected_fields
@dataclass(slots=True)
class DiagnosticsSettings:
    """The settings that change behaviour, as counts and switches only."""

    autostart: bool
    system_tray: bool
    hotkeys: int
    commands: int
    media_directories: int
    allowed_secondary_mount_points: int
    cameras_capture: bool
    desktop_window_titles: bool
    desktop_hyprland_code: bool


@filter_unexpected_fields
@dataclass(slots=True)
class DiagnosticsLogRecord:
    """A recent warning or error from the app's log.

    time is in Unix seconds, and error has the home directory and user name
    masked.
    """

    time: int
    level: str
    message: str
    error: str | None
    module: str | None
    event: str | None


@filter_unexpected_fields
@dataclass(slots=True)
class Diagnostics:
    """What the app knows about its own health, safe to share in a bug report.

    started_at is in Unix seconds. settings is None when the app can't read
    them, and recent_errors holds up to the last 20, oldest first.
    """

    version: str
    platform: str
    architecture: str
    started_at: int
    log_level: str
    modules: list[DiagnosticsModule]
    settings: DiagnosticsSettings | None
    recent_errors: list[DiagnosticsLogRecord]

    def __post_init__(self) -> None:
        """Post Init."""
        self.modules = [
            DiagnosticsModule(**cast(dict, module))
            if isinstance(module, dict)
            else module
            for module in self.modules
        ]
        if isinstance(self.settings, dict):
            self.settings = DiagnosticsSettings(**cast(dict, self.settings))
        self.recent_errors = [
            DiagnosticsLogRecord(**cast(dict, record))
            if isinstance(record, dict)
            else record
            for record in self.recent_errors
        ]
