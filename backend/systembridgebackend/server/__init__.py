"""System Bridge: Server"""
import logging
import os
import sys
from collections.abc import Awaitable, Callable
from datetime import timedelta
from os import walk
from typing import Any, Optional

from fastapi import Depends, FastAPI, File, Header, Query, WebSocket, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
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
from systembridgeshared.models.keyboard_key import KeyboardKey
from systembridgeshared.models.keyboard_text import KeyboardText
from systembridgeshared.models.media_files import File as MediaFile
from systembridgeshared.models.media_files import MediaFiles
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.models.notification import Notification
from systembridgeshared.settings import Settings

from .._version import __version__
from ..data import Data
from ..gui import GUI, GUIAttemptsExceededException
from ..modules.listeners import Listeners
from ..server.keyboard import keyboard_keypress, keyboard_text
from ..server.mdns import MDNSAdvertisement
from ..server.media import (
    get_directories,
    get_file,
    get_file_data,
    get_files,
    write_file,
)
from ..server.websocket import WebSocketHandler

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
for _, dirs, _ in walk(os.path.join(os.path.dirname(__file__), "../modules")):  # type: ignore
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


@app.post("/api/keyboard", dependencies=[Depends(security_api_key)])
def send_keyboard_event(keyboard_event: KeyboardKey | KeyboardText) -> dict[str, str]:
    """Send keyboard event."""
    if isinstance(keyboard_event, KeyboardKey):
        try:
            keyboard_keypress(keyboard_event.key)
        except ValueError as error:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, detail={"error": str(error)}
            )
        return {
            "message": "Keypress sent",
            **keyboard_event.dict(),
        }
    elif isinstance(keyboard_event, KeyboardText):
        keyboard_text(keyboard_event.text)
        return {
            "message": "Text sent",
            **keyboard_event.dict(),
        }
    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid keyboard event")


@app.get("/api/media", dependencies=[Depends(security_api_key)])
def get_media_directories() -> dict[str, list[dict[str, str]]]:
    """Get media directories."""
    return {
        "directories": get_directories(settings),
    }


@app.get("/api/media/files", dependencies=[Depends(security_api_key)])
def get_media_files(
    query_base: str = Query(..., alias="base"),
    query_path: Optional[str] = Query(None, alias="path"),
) -> MediaFiles:
    """Get media files."""
    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": "Cannot find base", "base": query_base},
        )

    path = os.path.join(root_path, query_path) if query_path else root_path
    if not os.path.exists(path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"message": "Cannot find path", "path": path},
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
        )
    if not os.path.isdir(path):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {"message": "Path is not a directory", "path": path},
        )

    return MediaFiles(
        files=get_files(settings, query_base, path),
        path=path,
    )


@app.get("/api/media/file", dependencies=[Depends(security_api_key)])
def get_media_file(
    query_base: str = Query(..., alias="base"),
    query_path: str = Query(..., alias="path"),
) -> MediaFile:
    """Get media file."""
    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": "Cannot find base", "base": query_base},
        )

    path = os.path.join(root_path, query_path) if query_path else root_path
    if not os.path.exists(path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"message": "Cannot find path", "path": path},
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
        )
    if not os.path.isfile(path):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {"message": "Path is not a file", "path": path},
        )

    file = get_file(query_base, path)
    if file is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"message": "Cannot get file", "path": path},
        )
    return file


@app.get("/api/media/file/data", dependencies=[Depends(security_api_key)])
def get_media_file_data(
    query_base: str = Query(..., alias="base"),
    query_path: str = Query(..., alias="path"),
) -> FileResponse:
    """Get media file."""
    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": "Cannot find base", "base": query_base},
        )

    path = os.path.join(root_path, query_path) if query_path else root_path
    if not os.path.exists(path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"message": "Cannot find path", "path": path},
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
        )
    if not os.path.isfile(path):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {"message": "Path is not a file", "path": path},
        )

    return get_file_data(path)


@app.post("/api/media/file/write", dependencies=[Depends(security_api_key)])
async def send_media_file(
    query_base: str = Query(..., alias="base"),
    query_path: str = Query(..., alias="path"),
    query_filename: str = Query(..., alias="filename"),
    file: bytes = File(...),
) -> dict[str, str]:
    """Get media file."""
    root_path = None
    for item in get_directories(settings):
        if item["key"] == query_base:
            root_path = item["path"]
            break

    if root_path is None or not os.path.exists(root_path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail={"message": "Cannot find base", "base": query_base},
        )

    path = os.path.join(root_path, query_path) if query_path else root_path
    if not os.path.exists(path):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {"message": "Cannot find path", "path": path},
        )
    if not os.path.abspath(path).startswith(os.path.abspath(root_path)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {
                "message": "Path is not underneath base path",
                "base": root_path,
                "path": path,
            },
        )

    await write_file(os.path.join(path, query_filename), file)

    return {
        "message": "File uploaded",
        "path": path,
        "filename": query_filename,
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
