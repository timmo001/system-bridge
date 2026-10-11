"""Test the response model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.response import Response


def test_response(snapshot: SnapshotAssertion):
    """Test the response."""
    response = Response(
        id="abc123",
        type="TYPE_TEST",
        data={"test": "test"},
        subtype="SUBTYPE_TEST",
        message="MESSAGE_TEST",
        module="MODULE_TEST",
    )
    assert isinstance(response, Response)
    assert response == snapshot
