"""Open URL."""

from dataclasses import dataclass


@dataclass(slots=True)
class OpenUrl:
    """Open URL."""

    url: str
