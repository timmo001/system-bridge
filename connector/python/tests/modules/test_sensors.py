"""Test the sensors module model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.sensors import FIXTURE_SENSORS
from systembridgeconnector.models.modules.sensors import Sensors


def test_sensors(snapshot: SnapshotAssertion):
    """Test the sensors model."""
    sensors = FIXTURE_SENSORS
    assert isinstance(sensors, Sensors)
    assert sensors == snapshot


def test_sensors_dict(snapshot: SnapshotAssertion):
    """Test the sensors model to dict."""
    sensors_dict = asdict(FIXTURE_SENSORS)
    assert isinstance(sensors_dict, dict)
    assert sensors_dict == snapshot

    sensors_converted = Sensors(**sensors_dict)
    assert isinstance(sensors_converted, Sensors)
    assert sensors_converted == snapshot(
        name="sensors-dict-converted",
    )
