"""Test the OpenPath model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.open_path import OpenPath


def test_open_path(snapshot: SnapshotAssertion):
    """Test the open_path."""
    open_path = OpenPath(
        path="/path/to/file",
    )
    assert isinstance(open_path, OpenPath)
    assert open_path == snapshot
