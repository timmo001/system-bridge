"""Media Get File."""

from dataclasses import dataclass


@dataclass(slots=True)
class MediaGetFile:
    """Media Get File.

    path is the absolute path to the file. The backend does not use base.
    """

    base: str
    path: str
