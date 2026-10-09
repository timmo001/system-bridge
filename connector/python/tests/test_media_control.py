"""Test the media_control model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.media_control import MediaAction, MediaControl


def test_media_control(snapshot: SnapshotAssertion):
    """Test the media_control."""
    media_control = MediaControl(
        action=MediaAction.PLAY.value,
        value=True,
    )
    assert isinstance(media_control, MediaControl)
    assert media_control == snapshot
