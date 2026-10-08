"""Media Control."""

from dataclasses import dataclass
from enum import Enum
from typing import Any


class MediaAction(Enum):
    """Media Action."""

    PLAY = "PLAY"
    PAUSE = "PAUSE"
    STOP = "STOP"
    PREVIOUS = "PREVIOUS"
    NEXT = "NEXT"
    SEEK = "SEEK"
    REWIND = "REWIND"
    FASTFORWARD = "FASTFORWARD"
    SHUFFLE = "SHUFFLE"
    REPEAT = "REPEAT"
    MUTE = "MUTE"
    VOLUME_DOWN = "VOLUME_DOWN"
    VOLUME_UP = "VOLUME_UP"
    VOLUMEDOWN = "VOLUME_DOWN"  # noqa: PIE796
    VOLUMEUP = "VOLUME_UP"  # noqa: PIE796


@dataclass(slots=True)
class MediaControl:
    """Media Control."""

    action: str
    value: Any | None = None
