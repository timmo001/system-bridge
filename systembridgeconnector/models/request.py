"""Request."""

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Request:
    """Request."""

    token: str = field(repr=False)
    id: str
    event: str
    data: dict[str, Any]
