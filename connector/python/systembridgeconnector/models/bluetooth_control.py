"""Bluetooth Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class BluetoothDeviceRequest:
    """A paired device, by its address from the bluetooth module."""

    address: str


@dataclass(slots=True)
class BluetoothPowerRequest:
    """Whether the Bluetooth adapter should be on."""

    powered: bool
