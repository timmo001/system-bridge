"""Command Prefab."""

from dataclasses import dataclass, field

from .helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass
class CommandPrefab:
    """A ready-made command and how it would run on the backend's system."""

    id: str
    name: str
    description: str = ""
    available: bool = False
    command: str = ""
    arguments: list[str] = field(default_factory=list)
    reason: str = ""
