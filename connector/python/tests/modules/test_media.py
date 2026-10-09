"""Test the media module model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.fixtures.modules.media import FIXTURE_MEDIA
from systembridgeconnector.models.modules.media import Media


def test_media(snapshot: SnapshotAssertion):
    """Test the media model."""
    media = FIXTURE_MEDIA
    assert isinstance(media, Media)
    assert media == snapshot
