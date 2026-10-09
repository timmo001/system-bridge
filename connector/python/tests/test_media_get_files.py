"""Test the media_get_files model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.media_get_files import MediaGetFiles


def test_media_get_files(snapshot: SnapshotAssertion):
    """Test the media_get_files."""
    media_get_files = MediaGetFiles(
        base="music",
        path="path/to/file",
    )
    assert isinstance(media_get_files, MediaGetFiles)
    assert media_get_files == snapshot
