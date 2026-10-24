"""Test the battery module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.battery import FIXTURE_BATTERY
from systembridgeconnector.models.modules.battery import Battery, BatteryInfo


def test_battery(snapshot: SnapshotAssertion):
    """Test the battery model."""
    battery = FIXTURE_BATTERY
    assert isinstance(battery, Battery)
    assert battery == snapshot


def test_battery_dict():
    """Test the battery model from a dict, as received from the backend."""
    battery = Battery(**asdict(FIXTURE_BATTERY))
    assert isinstance(battery.batteries[0], BatteryInfo)
    assert battery == FIXTURE_BATTERY
