"""Execute Request."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ExecuteRequest:
    """Execute Request."""

    commandID: str  # noqa: N815  # pylint: disable=invalid-name
