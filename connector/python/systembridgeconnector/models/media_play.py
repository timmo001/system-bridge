"""Media Play."""

from dataclasses import dataclass


@dataclass(slots=True)
class MediaPlay:
    """Media Play."""

    url: str
    album: str | None = None
    artist: str | None = None
    autoplay: bool | None = False
    cover: str | None = None
    title: str | None = None
    volume: float | None = 40
