"""System Bridge: Server Handler - Update"""
from systembridgeshared.settings import Settings
from systembridgeshared.update import Update


async def handler_update(
    request,
    _: Settings,
):
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
