"""Processes."""

from __future__ import annotations

from dataclasses import dataclass

from ..helpers import filter_unexpected_fields


@filter_unexpected_fields
@dataclass(slots=True)
class Process:
    """Process."""

    id: float
    name: str | None = None
    cpu_usage: float | None = None
    created: float | None = None
    memory_usage: float | None = None
    path: str | None = None
    status: str | None = None
    username: str | None = None
    working_directory: str | None = None
