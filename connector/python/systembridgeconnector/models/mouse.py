"""Mouse."""

from dataclasses import dataclass
from enum import StrEnum


class MouseButtonName(StrEnum):
    """A mouse button."""

    LEFT = "left"
    RIGHT = "right"
    MIDDLE = "middle"


class MouseButtonAction(StrEnum):
    """Hold a mouse button down or release it."""

    DOWN = "down"
    UP = "up"


@dataclass(slots=True)
class MouseMove:
    """Move the pointer by an amount, in pixels."""

    x: int = 0
    y: int = 0


@dataclass(slots=True)
class MouseClick:
    """Click a mouse button, left by default."""

    button: MouseButtonName | None = None
    double: bool | None = None


@dataclass(slots=True)
class MouseButton:
    """Hold a mouse button down or release it, to drag."""

    action: MouseButtonAction
    button: MouseButtonName | None = None


@dataclass(slots=True)
class MouseScroll:
    """Scroll by wheel notches. Positive y scrolls up, positive x right."""

    x: int = 0
    y: int = 0
