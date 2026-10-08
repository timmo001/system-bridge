"""Execute Result."""

from dataclasses import dataclass


@dataclass(slots=True)
class ExecuteResult:
    """Execute Result."""

    commandID: str  # noqa: N815
    exitCode: int  # noqa: N815
    stdout: str
    stderr: str
    error: str | None = None
