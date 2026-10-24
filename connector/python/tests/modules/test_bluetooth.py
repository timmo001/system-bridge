"""Test the bluetooth module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.bluetooth import FIXTURE_BLUETOOTH
from systembridgeconnector.models.modules.bluetooth import Bluetooth, BluetoothDevice


def test_bluetooth(snapshot: SnapshotAssertion):
    """Test the bluetooth model."""
    bluetooth = FIXTURE_BLUETOOTH
    assert isinstance(bluetooth, Bluetooth)
    assert bluetooth == snapshot


def test_bluetooth_dict():
    """Test the bluetooth model from a dict, as received from the backend."""
    bluetooth = Bluetooth(**asdict(FIXTURE_BLUETOOTH))
    assert isinstance(bluetooth.devices[0], BluetoothDevice)
    assert bluetooth == FIXTURE_BLUETOOTH
