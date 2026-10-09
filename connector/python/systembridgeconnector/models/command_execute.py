"""Execute Request."""

from dataclasses import dataclass


@dataclass(slots=True)
class ExecuteRequest:
    """Execute Request."""

    commandID: str  # noqa: N815
