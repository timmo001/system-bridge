"""Test the media_play model."""

from syrupy.assertion import SnapshotAssertion

from systembridgeconnector.models.media_play import MediaPlay


def test_media_play(snapshot: SnapshotAssertion):
    """Test the media_play."""
    media_play = MediaPlay(
        url="https://www.example.com/audio.mp3",
        album="Album",
        artist="Artist",
        autoplay=True,
        cover="https://www.example.com/cover.png",
        title="Title",
        volume=100,
    )
    assert isinstance(media_play, MediaPlay)
    assert media_play == snapshot
