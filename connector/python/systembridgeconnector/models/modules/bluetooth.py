"""Bluetooth."""

from dataclasses import dataclass, field
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class BluetoothDevice:
    """Bluetooth Device."""

    address: str
    name: str
    type: str | None = None
    connected: bool = False


@filter_unexpected_fields
@dataclass(slots=True)
class Bluetooth:
    """Bluetooth."""

    devices: list[BluetoothDevice] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.devices = [
            BluetoothDevice(**cast(dict, d)) if isinstance(d, dict) else d
            for d in self.devices or []
        ]
