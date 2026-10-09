"""Test the request model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.request import Request


def test_request(snapshot: SnapshotAssertion):
    """Test the request."""
    request = Request(
        token="abc123",
        id="abc123",
        event="EVENT_TEST",
        data={"test": "test"},
    )
    assert isinstance(request, Request)
    assert request == snapshot
