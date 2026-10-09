"""Test the battery module model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.battery import FIXTURE_BATTERY
from systembridgeconnector.models.modules.battery import Battery


def test_battery(snapshot: SnapshotAssertion):
    """Test the battery model."""
    battery = FIXTURE_BATTERY
    assert isinstance(battery, Battery)
    assert battery == snapshot
