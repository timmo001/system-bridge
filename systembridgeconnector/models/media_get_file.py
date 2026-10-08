"""Media Get File."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class MediaGetFile:
    """Media Get File."""

    base: str
    path: str
