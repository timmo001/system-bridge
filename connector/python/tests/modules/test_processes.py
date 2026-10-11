"""Test the networks module model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.processes import FIXTURE_PROCESSES
from systembridgeconnector.models.modules.processes import Process


def test_networks(snapshot: SnapshotAssertion):
    """Test the processes model."""
    processes = FIXTURE_PROCESSES
    assert isinstance(processes, list)
    assert isinstance(processes[0], Process)
    assert processes == snapshot
