"""System Bridge: Server Handler - Update"""
import asyncio

from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.common import application_restart
from systembridgeshared.update import Update


async def handler_update(
    request: Request,
) -> HTTPResponse:
    """Handle the update request."""
    versions = Update().update(
        request.args.get("version"),
        wait=False,
    )
    asyncio.get_running_loop().call_later(2, application_restart)
    return json(
        {
            "message": "Updating the application",
            "versions": versions,
        }
    )
