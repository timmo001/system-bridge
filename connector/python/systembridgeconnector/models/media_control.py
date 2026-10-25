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


@dataclass(slots=True)
class MediaControl:
    """Media Control."""

    action: str
