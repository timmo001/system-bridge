"""Test the keyboard_key model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.keyboard_key import KeyboardKey


def test_keyboard_key(snapshot: SnapshotAssertion):
    """Test the keyboard_key."""
    keyboard_key = KeyboardKey(
        key="A",
    )
    assert isinstance(keyboard_key, KeyboardKey)
    assert keyboard_key == snapshot
