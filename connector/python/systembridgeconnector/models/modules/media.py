"""Media."""

from dataclasses import dataclass, field
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class MediaPlayer:
    """A media player, which MediaControl can pick by its id."""

    id: str
    name: str
    status: str
    title: str = ""
    artist: str = ""
    album_artist: str | None = None
    album_title: str | None = None
    duration: float | None = None
    is_next_enabled: bool | None = None
    is_pause_enabled: bool | None = None
    is_play_enabled: bool | None = None
    is_previous_enabled: bool | None = None
    is_seek_enabled: bool | None = None
    is_stop_enabled: bool | None = None
    playback_rate: float | None = None
    position: float | None = None
    repeat: str | None = None
    shuffle: bool | None = None
    thumbnail: str | None = None
    track_number: int | None = None
    volume: float | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Media:
    """Media Info, for the player in player."""

    album_artist: str | None = None
    album_title: str | None = None
    artist: str | None = None
    duration: float | None = None
    is_fast_forward_enabled: bool | None = None
    is_next_enabled: bool | None = None
    is_pause_enabled: bool | None = None
    is_play_enabled: bool | None = None
    is_previous_enabled: bool | None = None
    is_rewind_enabled: bool | None = None
    is_seek_enabled: bool | None = None
    is_stop_enabled: bool | None = None
    playback_rate: float | None = None
    player: str | None = None
    players: list[MediaPlayer] = field(default_factory=list)
    position: float | None = None
    repeat: str | None = None
    shuffle: bool | None = None
    status: str | None = None
    subtitle: str | None = None
    thumbnail: str | None = None
    title: str | None = None
    track_number: int | None = None
    type: str | None = None
    updated_at: float | None = None
    volume: float | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        self.players = [
            MediaPlayer(**cast(dict, p)) if isinstance(p, dict) else p
            for p in self.players or []
        ]
