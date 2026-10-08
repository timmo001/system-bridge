"""Test the update model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.update import Update


def test_update(snapshot: SnapshotAssertion):
    """Test the update."""
    update = Update(
        version="1.0.0",
    )
    assert isinstance(update, Update)
    assert update == snapshot
