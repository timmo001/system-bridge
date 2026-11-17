"""Input status."""

from dataclasses import dataclass


@dataclass(slots=True)
class InputStatus:
    """Which backend presses keys and moves the pointer, or why none can."""

    available: bool
    backend: str | None = None
    reason: str | None = None
