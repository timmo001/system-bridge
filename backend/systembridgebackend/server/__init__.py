"""System Bridge: Server"""
from sanic import Sanic
from sqlite3 import Connection

from systembridgebackend import Base
from systembridgebackend.server.cpu import CPU


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

        CPU(self._database, self._server)

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
