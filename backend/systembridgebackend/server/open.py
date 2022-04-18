from os import startfile
from webbrowser import open_new_tab

from sanic.request import Request
from sanic.response import HTTPResponse, json


async def handler_open(
    request: Request,
) -> HTTPResponse:
    if "path" in request.json:
        startfile(request.json["path"])
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
