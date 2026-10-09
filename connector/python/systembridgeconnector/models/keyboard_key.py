"""Keyboard Key."""

from dataclasses import dataclass


@dataclass(slots=True)
class KeyboardKey:
    """Keyboard Key.

    delay is in milliseconds.
    """

    key: str
    modifiers: list[str] | None = None
    delay: int | None = None
