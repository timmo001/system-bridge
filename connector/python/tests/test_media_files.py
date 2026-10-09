"""Test the media_files model."""

from dataclasses import asdict

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.media_files import FIXTURE_MEDIA_FILES
from systembridgeconnector.models.media_files import MediaFile, MediaFiles


def test_media_files(snapshot: SnapshotAssertion):
    """Test the media_files."""
    media_files = FIXTURE_MEDIA_FILES
    assert isinstance(media_files, MediaFiles)
    assert isinstance(media_files.files, list)
    assert isinstance(media_files.files[0], MediaFile)
    assert media_files == snapshot


def test_media_files_dict(snapshot: SnapshotAssertion):
    """Test media files dict."""
    media_files_dict = asdict(FIXTURE_MEDIA_FILES)
    assert isinstance(media_files_dict, dict)
    assert media_files_dict == snapshot

    media_files_converted = MediaFiles(**media_files_dict)
    assert isinstance(media_files_converted, MediaFiles)
    assert media_files_converted == snapshot(
        name="media-files-dict-converted",
    )
