"""Memory."""

from __future__ import annotations

from dataclasses import dataclass

from ..helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class MemorySwap:
    """Memory Swap."""

    total: int | None = None
    used: int | None = None
    free: int | None = None
    percent: float | None = None
    sin: int | None = None
    sout: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class MemoryVirtual:
    """Memory Virtual."""

    total: int | None = None
    available: int | None = None
    percent: float | None = None
    used: int | None = None
    free: int | None = None
    active: int | None = None
    inactive: int | None = None
    buffers: int | None = None
    cached: int | None = None
    wired: int | None = None
    shared: int | None = None


@filter_unexpected_fields
@dataclass(slots=True)
class Memory:
    """Memory."""

    swap: MemorySwap | None = None
    virtual: MemoryVirtual | None = None

    def __post_init__(self) -> None:
        """Post Init."""
        if isinstance(self.swap, dict):
            self.swap = MemorySwap(**self.swap)

        if isinstance(self.virtual, dict):
            self.virtual = MemoryVirtual(**self.virtual)
