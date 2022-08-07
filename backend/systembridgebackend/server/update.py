"""System Bridge: Server Handler - Update"""
from systembridgeshared.models.update import Update as UpdateModel
from systembridgeshared.update import Update


async def handler_update(data: UpdateModel) -> dict:
    """Handle the update request."""
    versions = Update().update(
        data.update,
        wait=False,
    )
    return {
        "message": "Updating the application",
        "versions": versions,
    }
