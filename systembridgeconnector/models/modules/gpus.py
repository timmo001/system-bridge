"""GPUs."""

from __future__ import annotations

from dataclasses import dataclass

from ..helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class GPU:
    """GPU."""

    id: str
    name: str
    core_clock: float | None = None
    core_load: float | None = None
    fan_speed: float | None = None
    memory_clock: float | None = None
    memory_load: float | None = None
    memory_free: float | None = None
    memory_used: float | None = None
    memory_total: float | None = None
    power_usage: float | None = None
    temperature: float | None = None
