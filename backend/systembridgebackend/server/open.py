"""System Bridge: Server Handler - Open"""
import os
import subprocess
import sys
from webbrowser import open_new_tab

from fastapi import HTTPException
from starlette.status import HTTP_400_BAD_REQUEST
from systembridgeshared.models.open import Open


def open_path(
    path: str,
) -> None:
    """Open a file."""
    if sys.platform == "win32":
        os.startfile(path)
    else:
        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.call([opener, path])


def open_url(
    url: str,
) -> None:
    """Open a URL in the default browser."""
    open_new_tab(url)


async def handler_open(data: Open) -> dict:
    """Open a file or a URL."""
    if data.path is not None:
        open_path(data.path)
        return {
            "message": f"Opening path: {data.path}",
        }
    if data.url is not None:
        open_url(data.url)
        return {
            "message": f"Opening URL: {data.url}",
        }

    raise HTTPException(
        status_code=HTTP_400_BAD_REQUEST,
        detail="No path or url provided",
    )
