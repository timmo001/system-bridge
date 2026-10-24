"""Display Control."""

from dataclasses import dataclass


@dataclass(slots=True)
class DisplayControl:
    """Display Control.

    id is the display's id from the displays module. Set brightness, in
    percent, power_state, or both.
    """

    id: str
    brightness: float | None = None
    power_state: str | None = None
