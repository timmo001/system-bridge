"""Request."""

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class Request:
    """A request over the WebSocket, once it's signed in with its key."""

    id: str
    event: str
    data: dict[str, Any]
