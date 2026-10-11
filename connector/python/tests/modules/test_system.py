"""Test the networks module model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.system import FIXTURE_SYSTEM
from systembridgeconnector.models.modules.system import System


def test_system(snapshot: SnapshotAssertion):
    """Test the system model."""
    system = FIXTURE_SYSTEM
    assert isinstance(system, System)
    assert system.microphone_usage == ["microphone1", "microphone2"]
    assert system == snapshot
