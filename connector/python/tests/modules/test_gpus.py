"""Test the gpus module model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.gpus import FIXTURE_GPUS
from systembridgeconnector.models.modules.gpus import GPU


def test_gpus(snapshot: SnapshotAssertion):
    """Test the GPUs model."""
    gpus = FIXTURE_GPUS
    assert isinstance(gpus, list)
    assert isinstance(gpus[0], GPU)
    assert gpus == snapshot
