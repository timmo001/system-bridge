"""Media Control."""

from dataclasses import dataclass
from enum import Enum


class MediaAction(Enum):
    """Media Action. The backend supports only these."""

    PLAY = "PLAY"
    PAUSE = "PAUSE"
    STOP = "STOP"
    PREVIOUS = "PREVIOUS"
    NEXT = "NEXT"
    MUTE = "MUTE"
    VOLUME_DOWN = "VOLUME_DOWN"
    VOLUME_UP = "VOLUME_UP"
    VOLUMEDOWN = "VOLUME_DOWN"  # noqa: PIE796
    VOLUMEUP = "VOLUME_UP"  # noqa: PIE796
    SEEK = "SEEK"
    SET_VOLUME = "SET_VOLUME"
    SET_SHUFFLE = "SET_SHUFFLE"
    SET_REPEAT = "SET_REPEAT"


class MediaRepeat(Enum):
    """What SET_REPEAT repeats."""

    NONE = "NONE"
    TRACK = "TRACK"
    LIST = "LIST"


@dataclass(slots=True)
class MediaControl:
    """Media Control.

    SEEK needs position, SET_VOLUME volume, SET_SHUFFLE shuffle and SET_REPEAT
    repeat. On Windows only the actions up to MUTE work, and not with player.
    """

    action: str
    # A player's id from the media module's players. None for the player the
    # module reports.
    player: str | None = None
    # Seconds from the start of the track
    position: float | None = None
    # 0 to 1
    volume: float | None = None
    shuffle: bool | None = None
    repeat: str | None = None
