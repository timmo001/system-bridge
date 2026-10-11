"""Test the OpenUrl model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.open_url import OpenUrl


def test_open_url(snapshot: SnapshotAssertion):
    """Test the open_url."""
    open_url = OpenUrl(
        url="https://www.example.com",
    )
    assert isinstance(open_url, OpenUrl)
    assert open_url == snapshot
