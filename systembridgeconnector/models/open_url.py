"""Open URL."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class OpenUrl:
    """Open URL."""

    url: str
