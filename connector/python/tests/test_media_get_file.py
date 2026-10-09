"""Test the media_get_file model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.media_get_file import MediaGetFile


def test_media_get_file(snapshot: SnapshotAssertion):
    """Test the media_get_file."""
    media_get_file = MediaGetFile(
        base="music",
        path="path/to/file",
    )
    assert isinstance(media_get_file, MediaGetFile)
    assert media_get_file == snapshot
