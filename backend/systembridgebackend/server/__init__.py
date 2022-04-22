"""System Bridge: Server"""
from datetime import timedelta
from os import walk
import os

from sanic import Sanic
from sanic.request import Request
from sanic.response import HTTPResponse, json
from sanic_scheduler import SanicScheduler, task

from systembridgebackend.modules.listeners import Listeners
from systembridgebackend.modules.update import Update
from systembridgebackend.server.auth import ApiKeyAuthentication
from systembridgebackend.server.keyboard import handler_keyboard
from systembridgebackend.server.media import (
    handler_media_files,
    handler_media_file,
    handler_media_file_data,
    handler_media_file_write,
)
from systembridgebackend.server.mdns import MDNSAdvertisement
from systembridgebackend.server.notification import handler_notification
from systembridgebackend.server.open import handler_open
from systembridgebackend.server.websocket import WebSocket
from systembridgeshared.base import Base
from systembridgeshared.const import SECRET_API_KEY, SETTING_PORT_API, SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.settings import Settings


class Server(Base):
    """Server"""

    def __init__(
        self,
        database: Database,
        settings: Settings,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._database = database
        self._settings = settings
        self._server = Sanic("SystemBridge")

        for _, dirs, _ in walk("systembridgebackend/modules"):
            implemented_modules = list(filter(lambda d: "__" not in d, dirs))
            break

        self._scheduler = SanicScheduler(self._server, utc=True)
        self._listeners = Listeners(self._database, implemented_modules)
        self._update = Update(self._database)

        auth = ApiKeyAuthentication(
            app=self._server,
            arg="apiKey",
            header="api-key",
            keys=[self._settings.get_secret(SECRET_API_KEY)],
        )

        mdns_advertisement = MDNSAdvertisement(self._settings)
        mdns_advertisement.advertise_server()

        @task(timedelta(minutes=2))
        async def update_data(_) -> None:
            """Update data"""
            await self._update.update_data(self._data_updated)

        @task(timedelta(seconds=30))
        async def update_frequent_data(_) -> None:
            """Update frequent data"""
            await self._update.update_frequent_data(self._data_updated)

        @auth.key_required
        async def handler_data_all(
            _: Request,
            table: str,
        ) -> HTTPResponse:
            """Data handler all"""
            if table not in implemented_modules:
                return json({"message": f"Data module {table} not found"}, status=404)
            return json(self._database.table_data_to_ordered_dict(table))

        @auth.key_required
        async def handler_data_by_key(
            _: Request,
            table: str,
            key: str,
        ) -> HTTPResponse:
            """Data handler by key"""
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

        @auth.key_required
        async def handler_generic(
            request: Request,
            function: callable,
        ) -> HTTPResponse:
            """Generic handler"""
            return await function(request)

        async def handler_websocket(
            _: Request,
            socket,
        ) -> None:
            """WebSocket handler"""
            websocket = WebSocket(
                self._database,
                self._settings,
                self._listeners,
                implemented_modules,
                socket,
            )
            await websocket.handler()

        self._server.add_route(
            handler_data_all,
            "/api/data/<table:str>",
            methods=["GET"],
        )
        self._server.add_route(
            handler_data_by_key,
            "/api/data/<table:str>/<key:str>",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_keyboard),
            "/api/keyboard",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_media_files),
            "/api/media/files",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_media_file),
            "/api/media/file",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_media_file_data),
            "/api/media/file/data",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_media_file_write),
            "/api/media/file/write",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_notification),
            "/api/notification",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: handler_generic(r, handler_open),
            "/api/open",
            methods=["POST"],
        )

        self._server.static(
            "/",
            "../frontend/out",
            strict_slashes=False,
            content_type="text/html",
        )
        self._server.add_websocket_route(handler_websocket, "/api/websocket")

    async def _data_updated(
        self,
        module: str,
    ) -> None:
        """Data updated"""
        await self._listeners.refresh_data_by_module(module)

    def start(self) -> None:
        """Start Server"""
        port = self._settings.get(SETTING_PORT_API)
        self._logger.info("Starting server on port: %s", port)
        self._server.run(
            host="0.0.0.0",
            port=port,
            debug=True if self._settings.get(SETTING_LOG_LEVEL) == "DEBUG" else False,
            auto_reload=True,
            motd=False,
        )

    def stop(self) -> None:
        """Stop Server"""
        self._logger.info("Stopping server")
        self._server.stop()
