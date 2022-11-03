"""System Bridge: Server Handler - Remote Bridge"""
from json import dumps
from typing import List

from sanic.request import Request
from sanic.response import HTTPResponse, json
from systembridgeshared.database import Database
from systembridgeshared.models.database_data_remote_bridge import RemoteBridge


def get_remote_bridges(
    database: Database,
) -> List[RemoteBridge]:
    """Get all remote bridges."""
    return database.get_data(RemoteBridge)


async def handler_get_remote_bridges(
    database: Database,
) -> HTTPResponse:
    """Handle get remote bridges request."""
    return json(
        {
            "message": "Got remote bridges",
            "data": [bridge.dict() for bridge in get_remote_bridges(database)],
        }
    )


async def handler_update_remote_bridge(
    request: Request,
    database: Database,
) -> HTTPResponse:
    """Handle the update remote bridge request."""
    if request.json is None:
        return json(
            {
                "mesage": "Missing JSON body",
            },
            status=400,
        )

    remote_bridge: RemoteBridge = RemoteBridge(**request.json)

    database.update_remote_bridge(
        RemoteBridge(
            key=remote_bridge.key,
            name=remote_bridge.name,
            host=remote_bridge.host,
            port=remote_bridge.port,
            api_key=remote_bridge.api_key,
        )
    )

    return json(
        {
            "message": "Data updated",
            "data": remote_bridge.dict(),
        }
    )
