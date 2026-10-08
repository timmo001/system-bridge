"""Action."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class Action:
    """Action."""

    command: str
    data: dict[str, Any] | None = None
    label: str | None = None
