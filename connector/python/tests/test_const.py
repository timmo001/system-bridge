"""Test const."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.const import MODEL_MAP


def test_model_map(snapshot: SnapshotAssertion):
    """Test the model_map."""
    assert isinstance(MODEL_MAP, dict)
    assert snapshot == MODEL_MAP
