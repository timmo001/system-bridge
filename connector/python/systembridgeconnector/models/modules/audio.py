"""Audio."""

from dataclasses import dataclass, field
from typing import cast

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class AudioDevice:
    """Audio Device."""

    id: str
    name: str
    volume: float | None = None
    muted: bool | None = None
    default: bool = False


@filter_unexpected_fields
@dataclass(slots=True)
class Audio:
    """Audio."""

    outputs: list[AudioDevice] = field(default_factory=list)
    inputs: list[AudioDevice] = field(default_factory=list)

    def __post_init__(self) -> None:
        """Post Init."""
        self.outputs = [
            AudioDevice(**cast(dict, d)) if isinstance(d, dict) else d
            for d in self.outputs or []
        ]
        self.inputs = [
            AudioDevice(**cast(dict, d)) if isinstance(d, dict) else d
            for d in self.inputs or []
        ]
