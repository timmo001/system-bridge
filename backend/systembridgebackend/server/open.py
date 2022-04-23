"""System Bridge: Server Handler - Open"""
import os
import subprocess
import sys
from webbrowser import open_new_tab

from sanic.request import Request
from sanic.response import HTTPResponse, json


async def handler_open(
    request: Request,
) -> HTTPResponse:
    """Open a file or a URL in the default browser."""
    if "path" in request.json:
        if sys.platform == "win32":
            os.startfile(request.json["path"])
        else:
            opener = "open" if sys.platform == "darwin" else "xdg-open"
            subprocess.call([opener, request.json["path"]])

        return json(
            {
                "message": f"Opening path: {request.json['path']}",
            }
        )
    if "url" in request.json:
        open_new_tab(request.json["url"])
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
