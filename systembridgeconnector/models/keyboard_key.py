"""Keyboard Key."""

from dataclasses import dataclass


@dataclass(slots=True)
class KeyboardKey:
    """Keyboard Key."""

    key: str
