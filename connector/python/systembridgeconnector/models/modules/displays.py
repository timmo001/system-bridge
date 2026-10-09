"""Displays."""

from dataclasses import dataclass

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class Display:
    """Display."""

    id: str
    name: str
    resolution_horizontal: int
    resolution_vertical: int
    x: int
    y: int
    width: int | None = None
    height: int | None = None
    is_primary: bool | None = None
    pixel_clock: float | None = None
    refresh_rate: float | None = None
