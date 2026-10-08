"""Media Get File."""

from dataclasses import dataclass


@dataclass(slots=True)
class MediaGetFile:
    """Media Get File."""

    base: str
    path: str
