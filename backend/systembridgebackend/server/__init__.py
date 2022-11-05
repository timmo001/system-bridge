"""System Bridge: Server"""
import asyncio
import logging
import os
import sys
from collections.abc import Awaitable, Callable
from datetime import timedelta
from os import walk
from typing import Optional, Union

from fastapi import Depends, FastAPI, Header, Query, Security, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader, APIKeyQuery
from fastapi.staticfiles import StaticFiles
from systembridgeshared.const import (
    HEADER_API_KEY,
    QUERY_API_KEY,
    SECRET_API_KEY,
    SETTING_LOG_LEVEL,
)
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

from .._version import __version__

# from systembridgeshared.base import Base
# from systembridgeshared.common import convert_string_to_correct_type
# from systembridgeshared.database import TABLE_MAP, Database
# from systembridgeshared.models.media_play import MediaPlay
# from systembridgeshared.models.notification import Notification


# from ..data import Data
# from ..gui import GUI, GUIAttemptsExceededException
# from ..modules.listeners import Listeners
# from ..server.keyboard import handler_keyboard
# from ..server.mdns import MDNSAdvertisement
# from ..server.media import (
#     handler_media_directories,
#     handler_media_file,
#     handler_media_file_data,
#     handler_media_file_write,
#     handler_media_files,
#     handler_media_play,
# )
# from ..server.notification import handler_notification
# from ..server.open import handler_open
# from ..server.power import (
#     handler_hibernate,
#     handler_lock,
#     handler_logout,
#     handler_restart,
#     handler_shutdown,
#     handler_sleep,
# )
# from ..server.update import handler_update
# from ..server.websocket import WebSocketHandler
# from .remote_bridge import (
#     handler_delete_remote_bridge,
#     handler_get_remote_bridges,
#     handler_update_remote_bridge,
# )

database = Database()
settings = Settings(database)

log_level = str(settings.get(SETTING_LOG_LEVEL))
setup_logger(log_level, "system-bridge")

logger = logging.getLogger("systembridgebackend.server")
logger.info("System Bridge %s: Server", __version__.public())

# auth_api_key_header = APIKeyHeader(
#     auto_error=True,
#     name=HEADER_API_KEY,
#     description="API Key Header",
# )
# auth_api_key_query = APIKeyQuery(
#     auto_error=True,
#     name=QUERY_API_KEY,
#     description="API Key Query Parameter",
# )


def security_api_key_header(
    api_key_header: Optional[str] = Header(alias=HEADER_API_KEY, default=None),
):
    """Get API key from request."""
    key = str(settings.get_secret(SECRET_API_KEY))
    logger.info("API Key: %s", key)
    logger.info("API Key Header: %s", api_key_header)
    if api_key_header is not None and api_key_header == key:
        logger.info("Authorized with API Key Header")
        return True
    return False


def security_api_key_query(
    api_key_query: Optional[str] = Query(alias=QUERY_API_KEY, default=None),
):
    """Get API key from request."""
    key = str(settings.get_secret(SECRET_API_KEY))
    logger.info("API Key: %s", key)
    logger.info("API Key Query: %s", api_key_query)
    if api_key_query is not None and api_key_query == key:
        logger.info("Authorized with API Key Query Parameter")
        return True
    return False


def security_api_key(
    api_key_header_result: bool = Depends(security_api_key_header),
    api_key_query_result: bool = Depends(security_api_key_query),
):
    """Get API key from request."""
    logger.info("API Key Header Result: %s", api_key_header_result)
    logger.info("API Key Query Result: %s", api_key_query_result)
    if not (api_key_header_result or api_key_query_result):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API Key",
        )


app = FastAPI(
    version=__version__.public(),
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins="*",
    allow_headers=[
        "accept",
        "api-key",
        "content-type",
        "origin",
    ],
    allow_methods=[
        "DELETE",
        "GET",
        "OPTIONS",
        "POST",
        "PUT",
    ],
)


@app.get("/")
def get_root() -> dict[str, str]:
    """Get root."""
    return {
        "message": "Hello!",
    }


@app.get("/api", dependencies=[Depends(security_api_key)])
def get_api_root() -> dict[str, str]:
    """Get API root."""
    return {
        "message": "Hello!",
        "version": __version__.public(),
    }


if "--no-frontend" not in sys.argv:
    try:
        # pylint: disable=import-error, import-outside-toplevel
        from systembridgefrontend import get_frontend_path

        frontend_path = get_frontend_path()
        logger.info("Serving frontend from: %s", frontend_path)
        app.mount(
            path="/",
            app=StaticFiles(
                directory=frontend_path,
                html=True,
            ),
            name="Frontend",
        )
    except (ImportError, ModuleNotFoundError) as error:
        logger.error("Frontend not found: %s", error)


# @app.get("/items/{item_id}")
# def read_item(item_id: int, q: Union[str, None] = None):
#     return {"item_id": item_id, "q": q}


# def __init__(
#     self,
#     database: Database,
#     settings: Settings,
# ) -> None:
#     """Initialize"""
#     super().__init__()
#     self._database = database
#     self._settings = settings

#     implemented_modules = []
#     for _, dirs, _ in walk(os.path.join(os.path.dirname(__file__), "../modules")):
#         implemented_modules = list(filter(lambda d: "__" not in d, dirs))
#         break

#     self._listeners = Listeners(self._database, implemented_modules)
#     self._data = Data(self._database, self._callback_data_updated)
#     self._gui: Optional[GUI] = None
#     self._gui_notification: Optional[GUI] = None
#     self._gui_player: Optional[GUI] = None

#     mdns_advertisement = MDNSAdvertisement(self._settings)
#     mdns_advertisement.advertise_server()

# async def _callback_data_updated(
#     self,
#     module: str,
# ) -> None:
#     """Data updated"""
#     await self._listeners.refresh_data_by_module(module)

# def _exit_application(self) -> None:
#     """Exit application"""
#     self._logger.info("Exit application")
#     self.stop_server()
#     self._logger.info("Server stopped. Exiting GUI(s) (if any)")
#     self.stop_guis()
#     self._logger.info("Exiting application")
#     sys.exit(0)

# def _callback_media_play(
#     self,
#     media_type: str,
#     media_play: MediaPlay,
# ) -> None:
#     """Callback to open media player"""
#     self._gui_player = GUI(self._settings)
#     self._gui_player.start(
#         "media-player",
#         media_type,
#         media_play.json(),
#     )

# def _callback_notification(
#     self,
#     notification: Notification,
# ) -> None:
#     """Callback to open media player"""
#     self._gui_notification = GUI(self._settings)
#     self._gui_notification.start(
#         "notification",
#         notification.json(),
#     )

# def start_server(self) -> None:
#     """Start Server"""
#     if (port := self._settings.get(SETTING_PORT_API)) is None:
#         raise ValueError("Port not set")
#     self._logger.info("Starting server on port: %s", port)

#     self._logger.info("Server stopped. Exiting application")
#     self._exit_application()

# def stop_server(self) -> None:
#     """Stop Server"""
#     self._logger.info("Remove listeners")
#     self._listeners.remove_all_listeners()
#     # if self._server is not None:
#     #     self._logger.info("Stop the event loop")
#     #     self._logger.info("Stopping server")
#     self._logger.info("Cancel any pending tasks")
#     event_loop = asyncio.get_event_loop()
#     if event_loop is not None and event_loop.is_running():
#         for pending_task in asyncio.all_tasks():
#             pending_task.cancel()

# def stop_guis(self) -> None:
#     """Stop GUIs"""
#     if self._gui is not None and self._gui.is_running():
#         self._gui.stop()
#         self._gui = None
#     if self._gui_notification is not None and self._gui_notification.is_running():
#         self._gui_notification.stop()
#         self._gui_notification = None
#     if self._gui_player is not None and self._gui_player.is_running():
#         self._gui_player.stop()
#         self._gui_player = None
