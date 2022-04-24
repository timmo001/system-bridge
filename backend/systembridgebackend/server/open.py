"""System Bridge: Server Handler - Open"""
import os
import subprocess
import sys
from webbrowser import open_new_tab

from sanic.request import Request
from sanic.response import HTTPResponse, json


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


async def handler_open(
    request: Request,
) -> HTTPResponse:
    """Open a file or a URL in the default browser."""
    if "path" in request.json:
        open_path(request.json["path"])
        return json(
            {
                "message": f"Opening path: {request.json['path']}",
            }
        )
    if "url" in request.json:
        open_url(request.json["url"])
        return json(
            {
                "message": f"Opening URL: {request.json['url']}",
            }
        )

    return json(
        {
            "message": "No path or url provided",
        },
        status=400,
    )
