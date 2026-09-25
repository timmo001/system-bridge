"""Setup for tests."""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from dataclasses import asdict
from json import loads
import logging
from typing import Any, Final

from aiohttp import web
from aiohttp.test_utils import TestClient

from systembridgeconnector.const import EventSubType, EventType
from systembridgeconnector.models.fixtures.media_files import FIXTURE_MEDIA_FILES
from systembridgeconnector.models.fixtures.modules.battery import FIXTURE_BATTERY
from systembridgeconnector.models.fixtures.modules.cpu import FIXTURE_CPU
from systembridgeconnector.models.fixtures.modules.disks import FIXTURE_DISKS
from systembridgeconnector.models.fixtures.modules.displays import FIXTURE_DISPLAYS
from systembridgeconnector.models.fixtures.modules.gpus import FIXTURE_GPUS
from systembridgeconnector.models.fixtures.modules.media import FIXTURE_MEDIA
from systembridgeconnector.models.fixtures.modules.memory import FIXTURE_MEMORY
from systembridgeconnector.models.fixtures.modules.networks import FIXTURE_NETWORKS
from systembridgeconnector.models.fixtures.modules.processes import FIXTURE_PROCESSES
from systembridgeconnector.models.fixtures.modules.sensors import FIXTURE_SENSORS
from systembridgeconnector.models.fixtures.modules.system import FIXTURE_SYSTEM
from systembridgeconnector.models.modules import ModulesData
from systembridgeconnector.models.request import Request
from systembridgeconnector.models.response import Response

_LOGGER = logging.getLogger(__name__)

API_HOST: Final[str] = "127.0.0.1"
TOKEN: Final[str] = "abc123"

WEBSOCKET_PATH: Final[str] = "/api/websocket"

REQUEST_ID: Final[str] = "test"

MODULES_DATA = ModulesData(
    battery=FIXTURE_BATTERY,
    cpu=FIXTURE_CPU,
    disks=FIXTURE_DISKS,
    displays=FIXTURE_DISPLAYS,
    gpus=FIXTURE_GPUS,
    media=FIXTURE_MEDIA,
    memory=FIXTURE_MEMORY,
    networks=FIXTURE_NETWORKS,
    processes=FIXTURE_PROCESSES,
    sensors=FIXTURE_SENSORS,
    system=FIXTURE_SYSTEM,
)

ClientSessionGenerator = Callable[..., Coroutine[Any, Any, TestClient]]


async def bad_request_response(_: web.Request):
    """Return a bad request response."""
    return web.json_response(
        {"test": "test"},
        status=400,
    )


async def json_response(_: web.Request):
    """Return a json response."""
    return web.json_response({"test": "test"})


async def text_response(_: web.Request):
    """Return a text response."""
    return web.Response(text="test")


async def unauthorised_response(_: web.Request):
    """Return an unauthorised response."""
    return web.json_response(
        {"test": "test"},
        status=401,
    )


async def process_request(request: Request) -> Response:
    """Process a request."""
    _LOGGER.info("Event: %s", request.event)

    if request.token != TOKEN:
        return Response(
            id=request.id,
            type=EventType.ERROR,
            subtype=EventSubType.BAD_TOKEN,
            data=request.data,
        )

    if request.event == EventType.GET_DATA:
        return Response(
            id=request.id,
            type=EventType.DATA_GET,
            data=request.data,
        )
    if request.event == EventType.GET_DIRECTORIES:
        return Response(
            id=request.id,
            type=EventType.DIRECTORIES,
            data=[
                {
                    "key": "documents",
                    "path": "/home/user/documents",
                },
                {
                    "key": "music",
                    "path": "/home/user/music",
                },
            ],
        )
    if request.event == EventType.GET_FILES:
        return Response(
            id=request.id,
            type=EventType.FILES,
            data=asdict(FIXTURE_MEDIA_FILES),
        )
    if request.event == EventType.GET_FILE:
        return Response(
            id=request.id,
            type=EventType.FILE,
            data=asdict(
                FIXTURE_MEDIA_FILES.files[0],
            ),
        )
    if request.event == EventType.REGISTER_DATA_LISTENER:
        return Response(
            id=request.id,
            type=EventType.DATA_LISTENER_REGISTERED,
            data=request.data,
        )
    if request.event == EventType.KEYBOARD_KEYPRESS:
        return Response(
            id=request.id,
            type=EventType.KEYBOARD_KEY_PRESSED,
            data=request.data,
        )
    if request.event == EventType.KEYBOARD_TEXT:
        return Response(
            id=request.id,
            type=EventType.KEYBOARD_TEXT_SENT,
            data=request.data,
        )
    if request.event == EventType.NOTIFICATION:
        return Response(
            id=request.id,
            type=EventType.NOTIFICATION_SENT,
            data=request.data,
        )
    if request.event == EventType.OPEN:
        return Response(
            id=request.id,
            type=EventType.OPENED,
            data=request.data,
        )
    if request.event == EventType.POWER_SLEEP:
        return Response(
            id=request.id,
            type=EventType.POWER_SLEEPING,
            data=request.data,
        )
    if request.event == EventType.POWER_HIBERNATE:
        return Response(
            id=request.id,
            type=EventType.POWER_HIBERNATING,
            data=request.data,
        )
    if request.event == EventType.POWER_RESTART:
        return Response(
            id=request.id,
            type=EventType.POWER_RESTARTING,
            data=request.data,
        )
    if request.event == EventType.POWER_SHUTDOWN:
        return Response(
            id=request.id,
            type=EventType.POWER_SHUTTINGDOWN,
            data=request.data,
        )
    if request.event == EventType.POWER_LOCK:
        return Response(
            id=request.id,
            type=EventType.POWER_LOCKING,
            data=request.data,
        )
    if request.event == EventType.POWER_LOGOUT:
        return Response(
            id=request.id,
            type=EventType.POWER_LOGGINGOUT,
            data=request.data,
        )
    if request.event == EventType.COMMAND_EXECUTE:
        return Response(
            id=request.id,
            type=EventType.COMMAND_COMPLETED,
            data={
                "commandID": request.data.get("commandID", ""),
                "exitCode": 0,
                "stdout": "Command output",
                "stderr": "",
                "error": None,
            },
            message="Command executed successfully",
        )
    if request.event == EventType.GET_SETTINGS:
        return Response(
            id=request.id,
            type=EventType.SETTINGS_RESULT,
            data={
                "api": {"token": "test-token", "port": 9170},
                "autostart": False,
                "keyboard_hotkeys": [],
                "log_level": "INFO",
                "media": {"directories": []},
                "commands": {
                    "allowlist": [
                        {
                            "id": "test-command-id",
                            "name": "Test Command",
                            "command": "/usr/bin/test",
                            "workingDir": "",
                            "arguments": [],
                        }
                    ]
                },
            },
            message="Got settings",
        )

    return Response(
        id=request.id,
        type=EventType.ERROR,
        subtype=EventSubType.UNKNOWN_EVENT,
        data=request.data,
    )


async def process_message(message_data: str) -> Response:
    """Process a message."""
    message_dict = loads(message_data)
    _LOGGER.debug("Message: %s", message_dict)
    request = Request(**message_dict)
    _LOGGER.debug("Request: %s", request)
    response = await process_request(request)
    _LOGGER.debug("Response: %s", response)
    return response
