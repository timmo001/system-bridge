"""Fixtures for media models."""

from systembridgeconnector.models.modules.media import Media

FIXTURE_MEDIA = Media(
    album_artist="Album Artist",
    album_title="Album Title",
    artist="Artist",
    duration=100,
    is_fast_forward_enabled=True,
    is_next_enabled=True,
    is_pause_enabled=True,
    is_play_enabled=True,
    is_previous_enabled=True,
    is_rewind_enabled=True,
    is_stop_enabled=True,
    playback_rate=1.0,
    position=100,
    repeat="repeat",
    shuffle=True,
    status="status",
    subtitle="subtitle",
    thumbnail="thumbnail",
    title="title",
    track_number=1,
    type="type",
    updated_at=100,
    volume=50,
)
