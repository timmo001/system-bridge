"""System Bridge: Server"""
from os import walk
from sqlite3 import Connection
from sanic import Sanic
from sanic.request import Request
from sanic.response import HTTPResponse, json

from systembridgebackend import Base
from systembridgebackend.server.auth import ApiKeyAuthentication
from systembridgebackend.server.notification import handler_notification
from systembridgebackend.server.open import handler_open


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

        auth = ApiKeyAuthentication(
            app=self._server,
            header="api-key",
            keys=["abc123"],
        )

        for _, dirs, _ in walk("./backend/systembridgebackend/modules"):
            implemented_modules = list(filter(lambda d: "__" not in d, dirs))
            break

        @auth.key_required
        async def handler_data_all(
            request: Request,
            table: str,
        ) -> HTTPResponse:
            if table not in implemented_modules:
                return json({"message": f"Data module {table} not found"}, status=404)
            return json(self._database.table_data_to_ordered_dict(table))

        @auth.key_required
        async def handler_data_by_key(
            request: Request,
            table: str,
            key: str,
        ) -> HTTPResponse:
            if table not in implemented_modules:
                return json({"message": f"Data module {table} not found"}, status=404)

            data = self._database.read_table_by_key(table, key).to_dict(
                orient="records"
            )[0]
            return json(
                {
                    data["key"]: data["value"],
                    "last_updated": data["timestamp"],
                }
            )

        self._server.add_route(
            handler_data_all, "/api/data/<table:str>", methods=["GET"]
        )
        self._server.add_route(
            handler_data_by_key, "/api/data/<table:str>/<key:str>", methods=["GET"]
        )
        self._server.add_route(
            handler_notification, "/api/notification", methods=["POST"]
        )
        self._server.add_route(handler_open, "/api/open", methods=["POST"])

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
