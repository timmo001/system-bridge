"""Media directories."""

from __future__ import annotations

from dataclasses import dataclass

from .helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class MediaDirectory:
    """Directory."""

    key: str
    name: str
    path: str
    description: str | None = None
