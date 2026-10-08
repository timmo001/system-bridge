"""Response."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class Response:
    """Response."""

    id: str
    type: str
    data: dict[str, Any] | list[Any]
    subtype: str | None = None
    message: str | None = None
    module: str | None = None
