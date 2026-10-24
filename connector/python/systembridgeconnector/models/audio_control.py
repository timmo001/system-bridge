"""Audio Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class AudioControl:
    """Audio Control.

    id is the device's id from the audio module's outputs or inputs. Set
    volume, in percent, muted, or default to make it the default device, or
    any of them together.
    """

    id: str
    volume: float | None = None
    muted: bool | None = None
    default: bool | None = None
