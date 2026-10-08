"""Keyboard Key."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class KeyboardKey:
    """Keyboard Key."""

    key: str
