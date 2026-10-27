"""Audio Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class AudioControl:
    """Audio Control.

    id is an id from the audio module's outputs, inputs or apps. Set volume,
    in percent, muted, default to make an output or input the default, or
    output to move an app's sound to that output, or any of them together.
    """

    id: str
    volume: float | None = None
    muted: bool | None = None
    default: bool | None = None
    output: str | None = None
