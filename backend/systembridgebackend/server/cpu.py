"""System Bridge: CPU"""
from sanic.request import Request
from sanic.response import HTTPResponse, json

from systembridgebackend.server.base import ServerBase


class CPU(ServerBase):
    """CPU"""

    async def all(
        self,
        request: Request,
    ) -> HTTPResponse:
        return json(self._database.table_data_to_ordered_dict("cpu"))
