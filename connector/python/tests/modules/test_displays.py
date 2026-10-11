"""Test the displays module model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.displays import FIXTURE_DISPLAYS
from systembridgeconnector.models.modules.displays import Display


def test_displays(snapshot: SnapshotAssertion):
    """Test the displays model."""
    displays = FIXTURE_DISPLAYS
    assert isinstance(displays, list)
    assert isinstance(displays[0], Display)
    assert displays == snapshot
