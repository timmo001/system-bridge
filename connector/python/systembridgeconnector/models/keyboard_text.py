"""Keyboard Text."""

from dataclasses import dataclass


@dataclass(slots=True)
class KeyboardText:
    """Keyboard Text.

    delay is in milliseconds.
    """

    text: str
    delay: int | None = None
