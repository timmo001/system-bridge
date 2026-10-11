"""Test the keyboard_text model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.keyboard_text import KeyboardText


def test_keyboard_text(snapshot: SnapshotAssertion):
    """Test the keyboard_text."""
    keyboard_text = KeyboardText(
        text="Test",
    )
    assert isinstance(keyboard_text, KeyboardText)
    assert keyboard_text == snapshot
