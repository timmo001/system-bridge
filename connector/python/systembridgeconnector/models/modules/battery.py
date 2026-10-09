"""Battery."""

from dataclasses import dataclass

from systembridgeconnector.models.helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class Battery:
    """Battery."""

    is_charging: bool | None = None
    percentage: float | None = None
    time_remaining: float | None = None
