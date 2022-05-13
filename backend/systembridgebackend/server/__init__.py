"""System Bridge: Server"""
import asyncio
from datetime import timedelta
import os
from os import walk
import sys
from typing import Callable

from sanic import Sanic
from sanic.models.handler_types import ListenerType
from sanic.request import Request
from sanic.response import HTTPResponse, json
from sanic_scheduler import SanicScheduler, task
from systembridgeshared.base import Base
from systembridgeshared.const import SECRET_API_KEY, SETTING_LOG_LEVEL, SETTING_PORT_API
from systembridgeshared.database import Database
from systembridgeshared.settings import Settings

from systembridgebackend.gui import GUIAttemptsExceededException, start_gui_threaded
from systembridgebackend.modules.listeners import Listeners
from systembridgebackend.modules.update import Update
from systembridgebackend.server.auth import ApiKeyAuthentication
from systembridgebackend.server.keyboard import handler_keyboard
from systembridgebackend.server.mdns import MDNSAdvertisement
from systembridgebackend.server.media import (
    handler_media_file,
    handler_media_file_data,
    handler_media_file_write,
    handler_media_files,
)
from systembridgebackend.server.notification import handler_notification
from systembridgebackend.server.open import handler_open
from systembridgebackend.server.websocket import WebSocketHandler


class ApplicationExitException(BaseException):
    """Forces application to close."""


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

        implemented_modules = []
        for _, dirs, _ in walk(os.path.join(os.path.dirname(__file__), "../modules")):
            implemented_modules = list(filter(lambda d: "__" not in d, dirs))
            break

        SanicScheduler(self._server, utc=True)
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

        @task(start=timedelta(seconds=2))
        async def _after_startup(_) -> None:
            """After startup"""
            if "--no-gui" not in sys.argv:
                try:
                    await start_gui_threaded(self._logger, self._settings)
                except GUIAttemptsExceededException:
                    self._logger.error("GUI could not be started. Exiting application")
                    await self._exit_application()

        @task(
            start=timedelta(seconds=10),
            period=timedelta(minutes=2),
        )
        async def _update_data(_) -> None:
            """Update data"""
            await self._update.update_data(self._data_updated)

        @task(
            start=timedelta(seconds=10),
            period=timedelta(seconds=30),
        )
        async def _update_frequent_data(_) -> None:
            """Update frequent data"""
            await self._update.update_frequent_data(self._data_updated)

        @auth.key_required
        async def _handler_data_all(
            _: Request,
            table: str,
        ) -> HTTPResponse:
            """Data handler all"""
            if table not in implemented_modules:
                return json({"message": f"Data module {table} not found"}, status=404)
            return json(self._database.table_data_to_ordered_dict(table))

        @auth.key_required
        async def _handler_data_by_key(
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
        async def _handler_generic(
            request: Request,
            function: Callable,
        ) -> HTTPResponse:
            """Generic handler"""
            return await function(request)

        async def _handler_websocket(
            _: Request,
            socket,
        ) -> None:
            """WebSocket handler"""
            websocket = WebSocketHandler(
                self._database,
                self._settings,
                self._listeners,
                implemented_modules,
                socket,
                self._callback_exit_application,
            )
            await websocket.handler()

        self._server.add_route(
            _handler_data_all,
            "/api/data/<table:str>",
            methods=["GET"],
        )
        self._server.add_route(
            _handler_data_by_key,
            "/api/data/<table:str>/<key:str>",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_keyboard),
            "/api/keyboard",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_media_files),
            "/api/media/files",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_media_file),
            "/api/media/file",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_media_file_data),
            "/api/media/file/data",
            methods=["GET"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_media_file_write),
            "/api/media/file/write",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_notification),
            "/api/notification",
            methods=["POST"],
        )
        self._server.add_route(
            lambda r: _handler_generic(r, handler_open),
            "/api/open",
            methods=["POST"],
        )

        if "--no-frontend" not in sys.argv:
            try:
                # pylint: disable=import-error, import-outside-toplevel
                from systembridgefrontend import get_frontend_path

                frontend_path = get_frontend_path()
                self._logger.info("Serving frontend from: %s", frontend_path)
                self._server.static(
                    "/",
                    frontend_path,
                    strict_slashes=False,
                    content_type="text/html",
                )
            except (ImportError, ModuleNotFoundError) as error:
                self._logger.error("Frontend not found: %s", error)

        self._server.add_websocket_route(
            _handler_websocket,
            "/api/websocket",
        )

    def _callback_exit_application(self) -> None:
        """Callback to exit application"""
        asyncio.create_task(self._exit_application())

    async def _data_updated(
        self,
        module: str,
    ) -> None:
        """Data updated"""
        await self._listeners.refresh_data_by_module(module)

    async def _exit_application(self) -> None:
        """Exit application"""
        self._logger.info("Exiting application")
        self.stop_server()

    def start_server(self) -> None:
        """Start Server"""
        port = self._settings.get(SETTING_PORT_API)
        if port is None:
            raise ValueError("Port not set")
        self._logger.info("Starting server on port: %s", port)
        self._server.run(
            host="0.0.0.0",
            port=int(port),
            debug=self._settings.get(SETTING_LOG_LEVEL) == "DEBUG",
            motd=False,
        )

    def stop_server(self) -> None:
        """Stop Server"""
        self._logger.info("Stopping server")
        loop = self._server.loop
        self._logger.info("Cancel any pending tasks")
        for pending_task in asyncio.all_tasks():
            pending_task.cancel()
        self._logger.info("Stop the event loop")
        loop.stop()
        # self._server.enable_websocket(False)
        self._listeners.remove_all_listeners()
        self._server.stop()
