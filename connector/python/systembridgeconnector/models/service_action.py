"""Service Action."""

from dataclasses import dataclass

from systembridgeconnector.models.helpers import filter_unexpected_fields


@dataclass(slots=True)
class ServiceActionRequest:
    """Service Action Request: an item's action, by the ids in the services module."""

    provider: str
    item: str
    action: str


@filter_unexpected_fields
@dataclass(slots=True)
class ServiceActionResult:
    """Service Action Result, sent to every client when an action finishes.

    summary is the first line it printed, or why it failed. output is what it
    printed, cut off at 64 KiB.
    """

    provider: str
    item: str
    action: str
    ok: bool
    summary: str
    output: str
