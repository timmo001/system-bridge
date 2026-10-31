"""Battery."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


class BatteryState(StrEnum):
    """Battery State."""

    CHARGING = "charging"
    DISCHARGING = "discharging"
    FULL = "full"
    NOT_CHARGING = "not_charging"
    EMPTY = "empty"
    UNKNOWN = "unknown"


class BatteryScope(StrEnum):
    """Battery Scope."""

    SYSTEM = "system"
    DEVICE = "device"


@filter_unexpected_fields
@dataclass(slots=True)
class BatteryInfo:
    """Battery Info."""

    name: str
    scope: BatteryScope
    state: BatteryState
    model: str | None = None
    serial: str | None = None
    percentage: float | None = None
    time_remaining: float | None = None
    power: float | None = None
    voltage: float | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Battery:
    """Battery."""

    is_charging: bool | None = None
    percentage: float | None = None
    time_remaining: float | None = None
    state: BatteryState | None = None
    power: float | None = None
    voltage: float | None = None
    ac_connected: bool | None = None
    batteries: list[BatteryInfo] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.batteries = [
            BatteryInfo(**cast(dict, b)) if isinstance(b, dict) else b
            for b in self.batteries or []
        ]
