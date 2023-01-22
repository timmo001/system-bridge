"""System Bridge: Update Utilities"""
from typing import Optional

from systembridgeshared.update import Update


def version_update(
    version: str,
) -> dict[str, Optional[str]]:
    """Handle the update request."""
    versions = Update().update(
        version,
        wait=False,
    )
    return versions
