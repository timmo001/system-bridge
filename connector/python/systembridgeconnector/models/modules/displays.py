"""Displays."""

from dataclasses import dataclass
from enum import StrEnum

from systembridgeconnector.models.helpers import filter_unexpected_fields


class DisplayPowerState(StrEnum):
    """Display Power State."""

    ON = "on"
    STANDBY = "standby"
    SUSPEND = "suspend"
    OFF = "off"


@filter_unexpected_fields
@dataclass(slots=True)
class Display:
    """Display."""

    id: str
    name: str
    resolution_horizontal: int
    resolution_vertical: int
    x: int | None = None
    y: int | None = None
    width: int | None = None
    height: int | None = None
    is_primary: bool | None = None
    pixel_clock: float | None = None
    refresh_rate: float | None = None
    brightness: float | None = None
    power_state: DisplayPowerState | None = None
