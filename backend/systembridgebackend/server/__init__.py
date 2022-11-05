"""System Bridge: Server"""
import logging
import os
import sys
from collections.abc import Awaitable, Callable
from datetime import timedelta
from os import walk
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, Query, WebSocket, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from systembridgeshared.common import convert_string_to_correct_type
from systembridgeshared.const import (
    HEADER_API_KEY,
    QUERY_API_KEY,
    SECRET_API_KEY,
    SETTING_LOG_LEVEL,
)
from systembridgeshared.database import TABLE_MAP, Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.models.data import DataDict
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.models.notification import Notification
from systembridgeshared.settings import Settings

from .._version import __version__
from ..data import Data
from ..gui import GUI, GUIAttemptsExceededException
from ..modules.listeners import Listeners
from ..server.mdns import MDNSAdvertisement
from ..server.websocket import WebSocketHandler

# from ..server.keyboard import handler_keyboard
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

implemented_modules = []
for _, dirs, _ in walk(os.path.join(os.path.dirname(__file__), "../modules")):
    implemented_modules = list(filter(lambda d: "__" not in d, dirs))
    break

listeners = Listeners(database, implemented_modules)


async def callback_data_updated(module: str) -> None:
    """Data updated"""
    await listeners.refresh_data_by_module(module)


data = Data(database, callback_data_updated)
gui: Optional[GUI] = None
gui_notification: Optional[GUI] = None
gui_player: Optional[GUI] = None

mdns_advertisement = MDNSAdvertisement(settings)
mdns_advertisement.advertise_server()


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


@app.get("/api/data/{module}", dependencies=[Depends(security_api_key)])
def get_data(module: str) -> DataDict:
    """Get data from module."""
    table_module = TABLE_MAP.get(module)
    if module not in implemented_modules or table_module is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": f"Data module {module} not found"},
        )
    return database.get_data_dict(table_module)


@app.get("/api/data/{module}/{key}", dependencies=[Depends(security_api_key)])
def get_data_by_key(
    module: str,
    key: str,
) -> dict[str, Any]:
    """Get data from module by key."""
    table_module = TABLE_MAP.get(module)
    if module not in implemented_modules or table_module is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": f"Data module {module} not found"},
        )
    data = database.get_data_item_by_key(table_module, key)
    if data is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": f"Data item {key} in module {module} not found"},
        )
    return {
        data.key: convert_string_to_correct_type(data.value),
        "last_updated": data.timestamp,
    }


@app.websocket("/api/websocket")
async def websocket_endpoint(websocket: WebSocket):
    """Websocket endpoint."""
    await websocket.accept()
    websocket_handler = WebSocketHandler(
        database,
        settings,
        listeners,
        implemented_modules,
        websocket,
        exit_application,
    )
    await websocket_handler.handler()


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


def exit_application() -> None:
    """Exit application"""
    logger.info("Exit application")
    # stop_server()
    logger.info("Server stopped. Exiting GUI(s) (if any)")
    # stop_guis()
    logger.info("Exiting application")
    sys.exit(0)


def callback_media_play(
    media_type: str,
    media_play: MediaPlay,
) -> None:
    """Callback to open media player"""
    gui_player = GUI(settings)
    gui_player.start(
        "media-player",
        media_type,
        media_play.json(),
    )


def callback_notification(notification: Notification) -> None:
    """Callback to open media player"""
    gui_notification = GUI(settings)
    gui_notification.start(
        "notification",
        notification.json(),
    )


# def start_server() -> None:
#     """Start Server"""
#     if (port := settings.get(SETTING_PORT_API)) is None:
#         raise ValueError("Port not set")
#     logger.info("Starting server on port: %s", port)

#     logger.info("Server stopped. Exiting application")
#     exit_application()


# def stop_server() -> None:
#     """Stop Server"""
#     logger.info("Remove listeners")
#     listeners.remove_all_listeners()
#     # if server is not None:
#     #     logger.info("Stop the event loop")
#     #     logger.info("Stopping server")
#     logger.info("Cancel any pending tasks")
#     event_loop = asyncio.get_event_loop()
#     if event_loop is not None and event_loop.is_running():
#         for pending_task in asyncio.all_tasks():
#             pending_task.cancel()


# def stop_guis() -> None:
#     """Stop GUIs"""
#     if gui is not None and gui.is_running():
#         gui.stop()
#         gui = None
#     if gui_notification is not None and gui_notification.is_running():
#         gui_notification.stop()
#         gui_notification = None
#     if gui_player is not None and gui_player.is_running():
#         gui_player.stop()
#         gui_player = None
