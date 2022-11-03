"""System Bridge: Server Handler - Update"""
from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_remote_bridge import RemoteBridge


async def handler_remote_bridge(
    request: Request,
    database: Database,
) -> HTTPResponse:
    """Handle the Remote Bridge request."""
    if request.json is None:
        return json(
            {
                "mesage": "Missing JSON body",
            },
            status=400,
        )

    remote_bridge: RemoteBridge = RemoteBridge(**request.json)

    database.update_data(
        RemoteBridge,
        RemoteBridge(
            key=remote_bridge.key,
            name=remote_bridge.name,
            host=remote_bridge.host,
            port=remote_bridge.port,
            api_key=remote_bridge.api_key,
        ),
    )

    return json(
        {
            "message": "Data updated",
        }
    )
