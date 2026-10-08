"""Keyboard Text."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class KeyboardText:
    """Keyboard Text."""

    text: str
