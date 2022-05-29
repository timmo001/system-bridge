"""System Bridge: Server Handler - Update"""
from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.update import Update


async def handler_update(
    request: Request,
) -> HTTPResponse:
    """Handle the update request."""
    versions = Update().update(
        request.args.get("version"),
        wait=False,
    )
    return json(
        {
            "message": "Updating the application",
            "versions": versions,
        }
    )
