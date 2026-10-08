"""Fixtures for testing."""

import asyncio
from collections.abc import AsyncGenerator
from dataclasses import asdict
from json import dumps

from aiohttp import web
from aiohttp.test_utils import TestClient
import pytest

from systembridgeconnector.const import EventSubType, EventType
from systembridgeconnector.http_client import HTTPClient
from systembridgeconnector.models.fixtures.modules.system import FIXTURE_SYSTEM
from systembridgeconnector.models.modules import Module, ModulesData
from systembridgeconnector.models.response import Response
from systembridgeconnector.websocket_client import WebSocketClient

from . import (
    _LOGGER,
    API_HOST,
    MODULES_DATA,
    TOKEN,
    ClientSessionGenerator,
    bad_request_response,
    json_response,
    process_message,
    text_response,
    unauthorised_response,
)


@pytest.fixture(name="mock_http_client_session")
def mock_http_client_session_generator(
    aiohttp_client: ClientSessionGenerator,
    socket_enabled: None,
) -> ClientSessionGenerator:
    """Return a client session."""

    async def create_client() -> TestClient:
        """Create a client session."""
        app = web.Application()
        app.router.add_delete("/test/json", json_response)
        app.router.add_get("/test/badrequest", bad_request_response)
        app.router.add_get("/test/json", json_response)
        app.router.add_get("/test/text", text_response)
        app.router.add_get("/test/unauthorised", unauthorised_response)
        app.router.add_post("/test/json", json_response)
        app.router.add_put("/test/json", json_response)

        return await aiohttp_client(app)

    return create_client


@pytest.fixture
async def mock_http_client(
    mock_http_client_session: ClientSessionGenerator,
) -> HTTPClient:
    """Return a HTTP client."""
    client = await mock_http_client_session()

    return HTTPClient(
        api_host=API_HOST,
        api_port=client.port,
        token=TOKEN,
        session=client.session,
    )


@pytest.fixture
def mock_modules_data() -> ModulesData:
    """Return a mock ModulesData."""
    return MODULES_DATA


@pytest.fixture(name="mock_websocket_session")
async def mock_websocket_session_generator(
    aiohttp_client: ClientSessionGenerator,
    socket_enabled: None,
) -> ClientSessionGenerator:
    """Return a websocket client."""

    async def create_client() -> TestClient:
        """Create a client session."""
        app = web.Application()
        app.router.add_get("/api/websocket", websocket_response)

        return await aiohttp_client(app)

    async def websocket_response(request) -> web.WebSocketResponse:
        """Return a websocket response."""
        ws = web.WebSocketResponse()
        await ws.prepare(request)

        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                response = await process_message(msg.data)
                _LOGGER.info(response)

                response_str = dumps(asdict(response))
                await ws.send_str(response_str)
                _LOGGER.debug("Sent text message")

                if response.type == EventType.DATA_GET:
                    data_response = Response(
                        id=response.id,
                        type=EventType.DATA_UPDATE,
                        module=Module.SYSTEM,
                        data=asdict(FIXTURE_SYSTEM),
                    )

                    _LOGGER.info(
                        "Data requested, sending system data: %s",
                        data_response,
                    )
                    await ws.send_str(dumps(asdict(data_response)))
                elif response.type == EventType.DATA_LISTENER_REGISTERED:
                    data_response = Response(
                        id=response.id,
                        type=EventType.DATA_UPDATE,
                        module=Module.SYSTEM,
                        data=asdict(FIXTURE_SYSTEM),
                    )

                    _LOGGER.info(
                        "Listener registered, sending system data: %s",
                        data_response,
                    )
                    await ws.send_str(dumps(asdict(data_response)))

                    _LOGGER.info("Also sending a simulated already registered message")
                    await ws.send_str(
                        dumps(
                            asdict(
                                Response(
                                    id=response.id,
                                    type=EventType.ERROR,
                                    subtype=EventSubType.LISTENER_ALREADY_REGISTERED,
                                    message="Listener already registered",
                                    data={},
                                )
                            )
                        )
                    )
            elif msg.type == web.WSMsgType.BINARY:
                await ws.send_bytes(msg.data)
                _LOGGER.debug("Sent binary message")
            elif msg.type == web.WSMsgType.CLOSE:
                await ws.close()
                _LOGGER.debug("WebSocket closed")

        return ws

    return create_client


@pytest.fixture(name="mock_websocket_client")
async def mock_websocket_client_not_connected(
    mock_websocket_session: ClientSessionGenerator,
) -> WebSocketClient:
    """Return a websocket client."""
    client = await mock_websocket_session()
    ws = await client.ws_connect("/api/websocket")

    return WebSocketClient(
        api_host=API_HOST,
        api_port=client.port,
        token=TOKEN,
        session=client.session,
        websocket=ws,
        can_close_session=True,
    )


@pytest.fixture(name="mock_websocket_client_connected")
async def mock_connected_websocket_client(
    mock_websocket_client: WebSocketClient,
) -> WebSocketClient:
    """Return a websocket client which is connected."""
    await mock_websocket_client.connect()

    return mock_websocket_client


@pytest.fixture(name="mock_websocket_client_listening")
async def mock_listening_websocket_client(
    mock_websocket_client_connected: WebSocketClient,
) -> AsyncGenerator[WebSocketClient]:
    """Return a websocket client which is connected and listening."""
    listener_task = asyncio.create_task(
        mock_websocket_client_connected.listen(
            callback=None,
            accept_other_types=False,
            name="Test WebSocket Listener",
        ),
        name="Test WebSocket Listener",
    )

    yield mock_websocket_client_connected

    if not listener_task.done():
        listener_task.cancel()

    # If the listener task threw an exception, raise it here
    if listener_task.done() and (exception := listener_task.exception()) is not None:
        raise exception
