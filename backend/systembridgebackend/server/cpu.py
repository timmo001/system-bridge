"""System Bridge: CPU"""
from sqlite3 import Connection
from sanic import Sanic
from sanic.request import Request
from sanic.response import HTTPResponse, json

from systembridgebackend.server.base import ServerBase


class CPU(ServerBase):
    """CPU"""

    def __init__(
        self,
        database: Connection,
        server: Sanic,
    ) -> None:
        """Initialize"""
        super().__init__(database)
        server.add_route(self.all, "/api/cpu", methods=["GET"])

    async def all(
        self,
        request: Request,
    ) -> HTTPResponse:
        return json(self._database.table_data_to_ordered_dict("cpu"))
