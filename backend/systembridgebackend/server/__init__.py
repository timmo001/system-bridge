"""System Bridge: Server"""
from sqlite3 import Connection
from sanic import Sanic
from sanic.request import Request
from sanic.response import HTTPResponse, json

from systembridgebackend import Base


class ServerBase(Base):
    """Server"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database


class Server(ServerBase):
    """Server"""

    def __init__(
        self,
        database: Connection,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        self._server = Sanic("SystemBridge")

        async def handler_all(
            request: Request,
            table: str,
        ) -> HTTPResponse:
            return json(self._database.table_data_to_ordered_dict(table))

        async def handler_key(
            request: Request,
            table: str,
            key: str,
        ) -> HTTPResponse:
            data = self._database.read_table_by_key(table, key).to_dict(
                orient="records"
            )[0]
            return json(
                {
                    data["key"]: data["value"],
                    "last_updated": data["timestamp"],
                }
            )

        self._server.add_route(handler_all, "/api/<table:str>", methods=["GET"])
        self._server.add_route(
            handler_key, "/api/<table:str>/<key:str>", methods=["GET"]
        )

        # self._server.static("/", "./frontend/dist/")
        # self._server.add_websocket_route(websocket, "/api/websocket")

    def start(self) -> None:
        """Start Server"""
        self._server.run(
            host="0.0.0.0",
            port=9170,
            auto_reload=True,
            debug=False,
        )
