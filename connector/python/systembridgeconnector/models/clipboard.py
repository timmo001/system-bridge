"""Clipboard."""

from dataclasses import dataclass


@dataclass(slots=True)
class ClipboardText:
    """The text on the clipboard."""

    text: str


@dataclass(slots=True)
class ClipboardTextRequest:
    """Text to put on the clipboard. Linux only."""

    text: str
