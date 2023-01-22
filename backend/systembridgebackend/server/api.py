"""System Bridge: API"""
import asyncio
import logging
import os
import sys
from collections.abc import Callable
from typing import Any, Optional, Union

from fastapi import Depends, FastAPI, File, Header, Query, Request, WebSocket, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from systembridgeshared.common import asyncio_get_loop, convert_string_to_correct_type
from systembridgeshared.const import HEADER_API_KEY, QUERY_API_KEY, SECRET_API_KEY
from systembridgeshared.database import TABLE_MAP, Database
from systembridgeshared.models.data import DataDict
from systembridgeshared.models.database_data_remote_bridge import RemoteBridge
from systembridgeshared.models.keyboard_key import KeyboardKey
from systembridgeshared.models.keyboard_text import KeyboardText
from systembridgeshared.models.media_files import File as MediaFile
from systembridgeshared.models.media_files import MediaFiles
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.models.notification import Notification
from systembridgeshared.models.open_path import OpenPath
from systembridgeshared.models.open_url import OpenUrl
from systembridgeshared.settings import Settings

from .._version import __version__
from ..gui import GUI
from ..modules.listeners import Listeners
from ..utilities.keyboard import keyboard_keypress, keyboard_text
from ..utilities.media import (
    get_directories,
    get_file,
    get_file_data,
    get_files,
    play_media,
    write_file,
)
from ..utilities.open import open_path, open_url
from ..utilities.power import (
    hibernate,
    lock,
    logout,
    restart,
    schedule_power_event,
    shutdown,
    sleep,
)
from ..utilities.remote_bridge import get_remote_bridges
from ..utilities.update import version_update
from .websocket import WebSocketHandler

database = Database()
settings = Settings(database)

logger = logging.getLogger("systembridgebackend.server.api")


def security_api_key_header(
    api_key_header: Optional[str] = Header(alias=HEADER_API_KEY, default=None),
):
    """Get API key from request."""
    key = str(settings.get_secret(SECRET_API_KEY))
    if api_key_header is not None and api_key_header == key:
        logger.info("Authorized with API Key Header")
        return True
    return False


def security_api_key_query(
    api_key_query: Optional[str] = Query(alias=QUERY_API_KEY, default=None),
):
    """Get API key from request."""
    key = str(settings.get_secret(SECRET_API_KEY))
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


class API(FastAPI):
    """Extended FastAPI"""

    def __init__(
        self,
        **kwargs: Any,
    ) -> None:
        """Initialize"""
        super().__init__(**kwargs)
        self.add_middleware(
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
        self.callback_exit: Callable[[], None]
        self.callback_open_gui: Callable[[str, str], None]
        self.listeners: Listeners
        self.implemented_modules: list[str] = []
        self.loop: asyncio.AbstractEventLoop = asyncio_get_loop()


app = API(
    title="System Bridge",
    version=__version__.public(),
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


@app.get("/api/data/{module}", dependencies=[Depends(security_api_key)])
def get_data(module: str) -> DataDict:
    """Get data from module."""
    table_module = TABLE_MAP.get(module)
    if module not in app.implemented_modules or table_module is None:
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
    if module not in app.implemented_modules or table_module is None:
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
def send_keyboard_event(
    keyboard_event: Union[KeyboardKey, KeyboardText]
) -> dict[str, str]:
    """Send keyboard event."""
    if isinstance(keyboard_event, KeyboardKey):
        try:
            keyboard_keypress(keyboard_event.key)
        except ValueError as error:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, detail={"error": str(error)}
            ) from error
        return {
            "message": "Keypress sent",
            **keyboard_event.dict(),
        }
    if isinstance(keyboard_event, KeyboardText):
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
    """Get media file info."""
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

    if (file := get_file(query_base, path)) is None:
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
    """Get media file data."""
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
    """Send media file."""
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


@app.post("/api/media/play", dependencies=[Depends(security_api_key)])
async def send_media_play(
    request: Request,
    query_autoplay: Optional[bool] = Query(False, alias="autoplay"),
    query_base: Optional[str] = Query(None, alias="base"),
    query_path: Optional[str] = Query(None, alias="path"),
    query_type: Optional[str] = Query(None, alias="type"),
    query_url: Optional[str] = Query(None, alias="url"),
    query_volume: Optional[float] = Query(40, alias="volume"),
) -> dict[str, str]:
    """Play media."""
    return await play_media(
        settings,
        callback_media_play,
        query_autoplay=query_autoplay,
        query_base=query_base,
        query_path=query_path,
        query_type=query_type,
        query_url=query_url,
        query_volume=query_volume,
        request_host=request.url.hostname,
        request_scheme=request.url.scheme,
    )


@app.post("/api/notification", dependencies=[Depends(security_api_key)])
def send_notification(notification: Notification) -> dict[str, str]:
    """Send notification."""
    app.callback_open_gui("notification", notification.json())
    return {"message": "Notification sent"}


@app.post("/api/open", dependencies=[Depends(security_api_key)])
def send_open(open_model: Union[OpenPath, OpenUrl]) -> dict[str, str]:
    """Send notification."""
    if isinstance(open_model, OpenPath) and open_model.path is not None:
        open_path(open_model.path)
        return {
            "message": f"Opening path: {open_model.path}",
        }
    if isinstance(open_model, OpenUrl) and open_model.url is not None:
        open_url(open_model.url)
        return {
            "message": f"Opening URL: {open_model.url}",
        }
    raise HTTPException(
        status.HTTP_400_BAD_REQUEST,
        {"message": "No path or URL specified"},
    )


@app.post("/api/power/sleep", dependencies=[Depends(security_api_key)])
def send_power_sleep() -> dict[str, str]:
    """Send power sleep."""
    app.loop.create_task(
        schedule_power_event(2, sleep),
        name="Power Sleep",
    )
    return {"message": "Sleeping"}


@app.post("/api/power/hibernate", dependencies=[Depends(security_api_key)])
def send_power_hibernate() -> dict[str, str]:
    """Send power hibernate."""
    app.loop.create_task(
        schedule_power_event(2, hibernate),
        name="Power Hibernate",
    )
    return {"message": "Hibernating"}


@app.post("/api/power/restart", dependencies=[Depends(security_api_key)])
def send_power_restart() -> dict[str, str]:
    """Send power restart."""
    app.loop.create_task(
        schedule_power_event(2, restart),
        name="Power Restart",
    )
    return {"message": "Restarting"}


@app.post("/api/power/shutdown", dependencies=[Depends(security_api_key)])
def send_power_shutdown() -> dict[str, str]:
    """Send power shutdown."""
    app.loop.create_task(
        schedule_power_event(2, shutdown),
        name="Power Shutdown",
    )
    return {"message": "Shutting down"}


@app.post("/api/power/lock", dependencies=[Depends(security_api_key)])
def send_power_lock() -> dict[str, str]:
    """Send power lock."""
    app.loop.create_task(
        schedule_power_event(2, lock),
        name="Power Lock",
    )
    return {"message": "Locking"}


@app.post("/api/power/logout", dependencies=[Depends(security_api_key)])
def send_power_logout() -> dict[str, str]:
    """Send power logout."""
    app.loop.create_task(
        schedule_power_event(2, logout),
        name="Power Logout",
    )
    return {"message": "Logging out"}


@app.delete("/api/remote/{key}", dependencies=[Depends(security_api_key)])
def delete_remote(key: str) -> dict[str, Union[dict, str]]:
    """Delete remote bridge."""
    bridges: list[RemoteBridge] = get_remote_bridges(database)
    remote_bridge: Optional[RemoteBridge] = None

    for bridge in bridges:
        if bridge.key == key:
            remote_bridge = bridge

    if remote_bridge is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {
                "message": "Remote bridge not found",
            },
        )

    database.delete_remote_bridge(remote_bridge.key)

    return {
        "message": "Deleted remote bridge",
        "data": remote_bridge.dict(),
    }


@app.get("/api/remote", dependencies=[Depends(security_api_key)])
def get_remote() -> dict[str, Union[list[dict], str]]:
    """Get remote bridges."""
    return {
        "message": "Got remote bridges",
        "data": [bridge.dict() for bridge in get_remote_bridges(database)],
    }


@app.post("/api/remote", dependencies=[Depends(security_api_key)])
def send_remote(remote: RemoteBridge) -> dict[str, Union[dict, str]]:
    """Send remote bridge."""
    database.update_remote_bridge(remote)
    return {
        "message": "Added remote bridge",
        "data": remote.dict(),
    }


@app.put("/api/remote/{key}", dependencies=[Depends(security_api_key)])
def update_remote(key: str, remote: RemoteBridge) -> dict[str, Union[dict, str]]:
    """Update remote bridge."""
    bridges: list[RemoteBridge] = get_remote_bridges(database)
    remote_bridge: Optional[RemoteBridge] = None

    for bridge in bridges:
        if bridge.key == key:
            remote_bridge = bridge

    if remote_bridge is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            {
                "message": "Remote bridge not found",
            },
        )

    database.update_remote_bridge(remote)

    return {
        "message": "Updated remote bridge",
        "data": remote.dict(),
    }


@app.post("/api/update", dependencies=[Depends(security_api_key)])
def send_update(
    query_version: str = Query(..., alias="version")
) -> dict[str, Union[dict[str, Optional[str]], str]]:
    """Send update."""
    if (versions := version_update(query_version)) is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            {"message": "Invalid version"},
        )
    return {
        "message": "Updating the application",
        "versions": versions,
    }


@app.websocket("/api/websocket")
async def websocket_endpoint(websocket: WebSocket):
    """Websocket endpoint."""
    await websocket.accept()
    websocket_handler = WebSocketHandler(
        database,
        settings,
        app.listeners,
        app.implemented_modules,
        websocket,
        app.callback_exit,
        app.callback_open_gui,
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
            app=StaticFiles(directory=frontend_path),
            name="Frontend",
        )
    except (ImportError, ModuleNotFoundError) as err:
        logger.error("Frontend not found: %s", err)


def callback_media_play(
    media_type: str,
    media_play: MediaPlay,
) -> None:
    """Callback to open media player"""
    gui_player = GUI(settings)
    app.loop.create_task(
        gui_player.start(
            app.callback_exit,
            "media-player",
            media_type,
            media_play.json(),
        ),
        name="GUI media player",
    )
