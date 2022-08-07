"""System Bridge: Server"""

import logging
from os import walk
from os.path import abspath, dirname, exists, isdir, isfile, join
import sys
import threading
import time
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Path, Security, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.security.api_key import APIKeyCookie, APIKeyHeader, APIKeyQuery
from fastapi.staticfiles import StaticFiles
import schedule
from starlette.routing import BaseRoute
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND,
)
from systembridgeshared.common import convert_string_to_correct_type
from systembridgeshared.const import (
    HEADER_API_KEY,
    QUERY_API_KEY,
    SECRET_API_KEY,
    SETTING_LOG_LEVEL,
)
from systembridgeshared.database import TABLE_MAP, Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.models.keyboard import Keyboard
from systembridgeshared.models.media_directories import MediaDirectories
from systembridgeshared.models.media_get_file import MediaGetFile
from systembridgeshared.models.media_get_files import MediaGetFiles
from systembridgeshared.models.media_play import MediaPlay
from systembridgeshared.models.media_write_file import MediaWriteFile
from systembridgeshared.models.notification import Notification
from systembridgeshared.models.open import Open
from systembridgeshared.models.update import Update
from systembridgeshared.settings import Settings

from ..data import Data
from ..gui import GUIAttemptsExceededException, start_gui_threaded
from ..modules.listeners import Listeners
from ..modules.system import System
from .keyboard import keyboard_keypress, keyboard_text
from .mdns import MDNSAdvertisement
from .media import (
    get_directories,
    get_file,
    get_file_data,
    get_files,
    handler_media_play,
    write_file,
)
from .notification import handler_notification
from .open import handler_open
from .power import (
    handler_hibernate,
    handler_lock,
    handler_logout,
    handler_restart,
    handler_shutdown,
    handler_sleep,
)
from .update import handler_update
from .websocket import WebSocketHandler

database = Database()
settings = Settings(database)

LOG_LEVEL = str(settings.get(SETTING_LOG_LEVEL))
setup_logger(LOG_LEVEL, "system-bridge")
logger = logging.getLogger(__name__)

implemented_modules = []
for _, dirs, _ in walk(join(dirname(__file__), "../modules")):  # type: ignore
    implemented_modules = list(filter(lambda d: "__" not in d, dirs))
    break


def exit_application() -> None:
    """Exit application"""
    schedule.clear()
    listeners.remove_all_listeners()
    sys.exit(0)


async def callback_data_updated(module: str) -> None:
    """Data updated"""
    await listeners.refresh_data_by_module(module)


def run_schedule():
    """Run Schedule"""
    while True:
        schedule.run_pending()
        time.sleep(1)


logger.info("Setup Listeners")

listeners = Listeners(database, implemented_modules)

logger.info("Setup Schedule")

data_updater = Data(database, callback_data_updated)
schedule.every(30).seconds.do(data_updater.request_update_frequent_data)
schedule.every(4).minutes.do(data_updater.request_update_data)
schedule.run_all(delay_seconds=10)
thread = threading.Thread(target=run_schedule)
thread.start()

logger.info("Setup API")

api_key_query = APIKeyQuery(name=QUERY_API_KEY, auto_error=False)
api_key_header = APIKeyHeader(name=HEADER_API_KEY, auto_error=False)
api_key_cookie = APIKeyCookie(name=HEADER_API_KEY, auto_error=False)

routes: list[BaseRoute] = []

app = FastAPI(
    docs_url=None,
    openapi_url=None,
    redoc_url=None,
    routes=routes,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Start GUI")

if "--no-gui" not in sys.argv:
    try:
        start_gui_threaded(logger, settings)
    except GUIAttemptsExceededException:
        logger.error("GUI could not be started. Exiting application")
        exit_application()

logger.info("Advertise API")

mdns_advertisement = MDNSAdvertisement(settings)
mdns_advertisement.advertise_server()


async def auth_api_key(
    api_key_query: str = Security(  # pylint: disable=redefined-outer-name
        api_key_query
    ),
    api_key_header: str = Security(  # pylint: disable=redefined-outer-name
        api_key_header
    ),
    api_key_cookie: str = Security(  # pylint: disable=redefined-outer-name
        api_key_cookie
    ),
):
    """Get API Key"""
    api_key = settings.get_secret(SECRET_API_KEY)
    if api_key_query == api_key:
        return api_key_query
    if api_key_header == api_key:
        return api_key_header
    if api_key_cookie == api_key:
        return api_key_cookie
    raise HTTPException(
        status_code=HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )


@app.get(
    "/logout",
    tags=["authentication"],
)
async def get_logout():
    """Logout and remove cookie"""
    response = RedirectResponse(url="/")
    response.delete_cookie(
        HEADER_API_KEY,
        domain="localhost",
    )
    return response


@app.get(
    "/",
    tags=["root"],
)
async def get_root() -> dict:
    """GET root"""
    return {
        "message": "The API server is running!",
    }


@app.get(
    "/docs",
    tags=["documentation"],
    dependencies=[Depends(auth_api_key)],
)
async def get_documentation(api_key: str = Depends(auth_api_key)):
    """GET documentation"""
    response = get_swagger_ui_html(
        title="System Bridge",
        openapi_url=f"/docs/json?{QUERY_API_KEY}={api_key}",
    )
    return response


@app.get(
    "/docs/json",
    tags=["documentation"],
    dependencies=[Depends(auth_api_key)],
)
async def get_open_api_endpoint():
    """GET OpenAPI"""
    response = JSONResponse(
        get_openapi(
            title="System Bridge",
            version=System().version(),
            routes=app.routes,
        )
    )
    return response


@app.get(
    "/api",
    tags=["api"],
    dependencies=[Depends(auth_api_key)],
)
async def get_api() -> dict:
    """GET API"""
    return {
        "message": "The API server is running!",
        "version": System().version(),
    }


@app.get(
    "/api/data/{module}",
    tags=["api", "data"],
    dependencies=[Depends(auth_api_key)],
)
async def get_data(module: str = Path(title="Name of module")) -> dict:
    """GET data"""
    if (table_module := TABLE_MAP.get(module)) is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data module {module} not found",
        )
    return database.get_data_dict(table_module).dict()


@app.get(
    "/api/data/{module}/{key}",
    tags=["api", "data"],
    dependencies=[Depends(auth_api_key)],
)
async def get_data_by_key(
    module: str = Path(title="Name of module"),
    key: str = Path(title="Key of item in module"),
) -> dict:
    """GET data by key"""
    if (table_module := TABLE_MAP.get(module)) is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data module {module} not found",
        )

    if (data := database.get_data_item_by_key(table_module, key)) is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data item {key} not found",
        )

    return {
        data.key: convert_string_to_correct_type(data.value),
        "last_updated": data.timestamp,
    }


@app.post(
    "/api/keyboard",
    tags=["api", "keyboard"],
    dependencies=[Depends(auth_api_key)],
)
async def post_keyboard(keyboard: Keyboard) -> dict:
    """POST keyboard"""
    if keyboard.key is not None:
        keyboard_keypress(keyboard.key)
        return {
            "message": "Keypress sent",
            "key": keyboard.key,
        }
    if keyboard.text is not None:
        keyboard_text(keyboard.text)
        return {
            "message": "Text sent",
            "text": keyboard.text,
        }
    raise HTTPException(
        status_code=HTTP_400_BAD_REQUEST,
        detail="key or text required",
    )


@app.get(
    "/api/media",
    tags=["api", "media"],
    dependencies=[Depends(auth_api_key)],
)
async def get_media_directories() -> MediaDirectories:
    """GET media directories"""
    return get_directories(settings)


@app.get(
    "/api/media/files",
    tags=["api", "media"],
    dependencies=[Depends(auth_api_key)],
)
async def get_media_files(query: MediaGetFiles = Depends()) -> dict:
    """GET media files"""
    root_path = None
    for item in get_directories(settings).directories:
        if item.key == query.base:
            root_path = item.path
            break

    if root_path is None or not exists(root_path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find base: {query.base}",
        )

    path = join(root_path, query.path) if query.path else root_path
    if not exists(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find path: {path}",
        )
    if not abspath(path).startswith(abspath(root_path)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not in base: {path}",
        )
    if not isdir(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not a directory: {path}",
        )

    return {
        "files": get_files(settings, query.base, path),
        "path": path,
    }


@app.get(
    "/api/media/file",
    tags=["api", "media"],
    dependencies=[Depends(auth_api_key)],
)
async def get_media_file(query: MediaGetFile = Depends()) -> Optional[dict]:
    """GET media file"""
    root_path = None
    for item in get_directories(settings).directories:
        if item.key == query.base:
            root_path = item.path
            break

    if root_path is None or not exists(root_path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find base: {query.base}",
        )

    path = join(root_path, query.path) if query.path else root_path
    if not exists(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find path: {path}",
        )
    if not abspath(path).startswith(abspath(root_path)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not in base: {path}",
        )
    if not isfile(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not a file: {path}",
        )

    return get_file(root_path, path)


@app.get(
    "/api/media/file/data",
    tags=["api", "media"],
    dependencies=[Depends(auth_api_key)],
)
async def get_media_file_data(query: MediaGetFile = Depends()) -> FileResponse:
    """GET media file data"""
    root_path = None
    for item in get_directories(settings).directories:
        if item.key == query.base:
            root_path = item.path
            break

    if root_path is None or not exists(root_path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find base: {query.base}",
        )

    path = join(root_path, query.path) if query.path else root_path
    if not exists(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find path: {path}",
        )
    if not abspath(path).startswith(abspath(root_path)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not in base: {path}",
        )
    if not isfile(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not a file: {path}",
        )

    return get_file_data(path)


@app.post(
    "/api/media/file/write",
    tags=["api", "media"],
    dependencies=[Depends(auth_api_key)],
)
async def post_media_file_write(
    query: MediaWriteFile = Depends(),
    file: bytes = File(),
) -> dict:
    """POST media file"""
    root_path = None
    for item in get_directories(settings).directories:
        if item.key == query.base:
            root_path = item.path
            break

    if root_path is None or not exists(root_path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find base: {query.base}",
        )

    path = join(root_path, query.path) if query.path else root_path
    if not exists(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Cannot find path: {path}",
        )
    if not abspath(path).startswith(abspath(root_path)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not in base: {path}",
        )
    if not isdir(path):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail=f"Path is not a directory: {path}",
        )

    await write_file(path, query.filename, file)

    return {
        "message": "File written",
        "path": path,
        "filename": query.filename,
    }


@app.post(
    "/api/media/play",
    tags=["api", "media"],
    dependencies=[Depends(auth_api_key)],
)
async def post_media_play(query: MediaPlay = Depends()) -> dict:
    """POST media play"""
    return await handler_media_play(settings, query)


@app.post(
    "/api/notification",
    tags=["api", "notification"],
    dependencies=[Depends(auth_api_key)],
)
async def post_notification(data: Notification) -> dict:
    """POST notification"""
    return await handler_notification(settings, data)


@app.post(
    "/api/open",
    tags=["api", "open"],
    dependencies=[Depends(auth_api_key)],
)
async def post_open(data: Open) -> dict:
    """POST open"""
    return await handler_open(data)


@app.post(
    "/api/power/sleep",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_power_sleep() -> dict:
    """POST power sleep"""
    return await handler_sleep()


@app.post(
    "/api/power/hibernate",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_power_hibernate() -> dict:
    """POST power hibernate"""
    return await handler_hibernate()


@app.post(
    "/api/power/restart",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_power_restart() -> dict:
    """POST power restart"""
    return await handler_restart()


@app.post(
    "/api/power/shutdown",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_power_shutdown() -> dict:
    """POST power shutdown"""
    return await handler_shutdown()


@app.post(
    "/api/power/lock",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_power_lock() -> dict:
    """POST power lock"""
    return await handler_lock()


@app.post(
    "/api/power/logout",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_power_logout() -> dict:
    """POST power logout"""
    return await handler_logout()


@app.post(
    "/api/update",
    tags=["api", "power"],
    dependencies=[Depends(auth_api_key)],
)
async def post_update(data: Update) -> dict:
    """POST update"""
    return await handler_update(data)


@app.websocket("/api/websocket")
async def use_websocket(websocket: WebSocket):
    """Websocket"""
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
        app.mount("/", StaticFiles(directory=frontend_path, html=True))
    except (ImportError, ModuleNotFoundError) as error:
        logger.error("Frontend not found: %s", error)
