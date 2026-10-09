"""Update."""

from dataclasses import dataclass


@dataclass(slots=True)
class Update:
    """Update."""

    version: str
