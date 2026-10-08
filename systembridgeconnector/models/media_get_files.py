"""Media Get Files."""

from dataclasses import dataclass


@dataclass(slots=True)
class MediaGetFiles:
    """Media Get Files."""

    base: str
    path: str | None = None
