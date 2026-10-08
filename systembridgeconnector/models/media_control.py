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
    VOLUMEDOWN = "VOLUME_DOWN"
    VOLUMEUP = "VOLUME_UP"


@dataclass(slots=True)
class MediaControl:
    """Media Control."""

    action: str
    value: Any | None = None
