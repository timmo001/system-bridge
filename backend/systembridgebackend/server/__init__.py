"""System Bridge: Server"""

import logging
from os import walk
from os.path import dirname, join
import sys
import threading
import time

from fastapi import Depends, FastAPI, HTTPException, Security, WebSocket
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.security.api_key import APIKeyCookie, APIKeyHeader, APIKeyQuery
import schedule
from starlette.responses import JSONResponse, RedirectResponse
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND,
)
from systembridgeshared.common import convert_string_to_correct_type
from systembridgeshared.const import HEADER_API_KEY, QUERY_API_KEY, SECRET_API_KEY
from systembridgeshared.database import TABLE_MAP, Database
from systembridgeshared.models.keyboard import Keyboard
from systembridgeshared.settings import Settings

from ..data import Data
from ..gui import GUIAttemptsExceededException, start_gui_threaded
from ..modules.listeners import Listeners
from ..modules.system import System
from .keyboard import keyboard_keypress, keyboard_text
from .mdns import MDNSAdvertisement
from .websocket import WebSocketHandler

logger = logging.getLogger(__name__)

database = Database()
settings = Settings(database)

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

data = Data(database, callback_data_updated)
schedule.every(30).seconds.do(data.request_update_frequent_data)
schedule.every(4).minutes.do(data.request_update_data)
schedule.run_all(delay_seconds=10)
thread = threading.Thread(target=run_schedule)
thread.start()

logger.info("Setup API")

api_key_query = APIKeyQuery(name=QUERY_API_KEY, auto_error=False)
api_key_header = APIKeyHeader(name=HEADER_API_KEY, auto_error=False)
api_key_cookie = APIKeyCookie(name=HEADER_API_KEY, auto_error=False)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

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
    api_key_query: str = Security(api_key_query),
    api_key_header: str = Security(api_key_header),
    api_key_cookie: str = Security(api_key_cookie),
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
    tags=["api"],
    dependencies=[Depends(auth_api_key)],
)
async def get_data(module: str) -> dict:
    """GET data"""
    table_module = TABLE_MAP.get(module)
    if table_module is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data module {module} not found",
        )
    return database.get_data_dict(table_module).dict()


@app.get(
    "/api/data/{module}/{key}",
    tags=["api"],
    dependencies=[Depends(auth_api_key)],
)
async def get_data_by_key(
    module: str,
    key: str,
) -> dict:
    """GET data by key"""
    table_module = TABLE_MAP.get(module)
    if table_module is None:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail=f"Data module {module} not found",
        )

    data = database.get_data_item_by_key(table_module, key)
    if data is None:
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
    tags=["api"],
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


@app.websocket("/api/websocket")
async def use_websocket(websocket: WebSocket):
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
