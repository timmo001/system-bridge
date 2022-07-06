"""System Bridge Connector: WebSocket Client"""
from __future__ import annotations

import asyncio
from collections.abc import Callable
import socket
from uuid import uuid4

import aiohttp

from systembridgeconnector.base import Base
from systembridgeconnector.const import (
    EVENT_API_KEY,
    EVENT_APP_ICON,
    EVENT_APP_NAME,
    EVENT_BASE,
    EVENT_DATA,
    EVENT_EVENT,
    EVENT_ID,
    EVENT_KEY,
    EVENT_MESSAGE,
    EVENT_MODULE,
    EVENT_MODULES,
    EVENT_PATH,
    EVENT_SUBTYPE,
    EVENT_TEXT,
    EVENT_TIMEOUT,
    EVENT_TITLE,
    EVENT_TYPE,
    EVENT_URL,
    EVENT_VERSION,
    MODEL_MAP,
    MODEL_RESPONSE,
    SUBTYPE_BAD_API_KEY,
    SUBTYPE_LISTENER_ALREADY_REGISTERED,
    TYPE_APPLICATION_UPDATE,
    TYPE_DATA_UPDATE,
    TYPE_ERROR,
    TYPE_EXIT_APPLICATION,
    TYPE_GET_DATA,
    TYPE_GET_DIRECTORIES,
    TYPE_GET_FILE,
    TYPE_GET_FILES,
    TYPE_KEYBOARD_KEYPRESS,
    TYPE_KEYBOARD_TEXT,
    TYPE_NOTIFICATION,
    TYPE_OPEN,
    TYPE_POWER_HIBERNATE,
    TYPE_POWER_LOCK,
    TYPE_POWER_LOGOUT,
    TYPE_POWER_RESTART,
    TYPE_POWER_SHUTDOWN,
    TYPE_POWER_SLEEP,
    TYPE_REGISTER_DATA_LISTENER,
)
from systembridgeconnector.exceptions import (
    AuthenticationException,
    BadMessageException,
    ConnectionClosedException,
    ConnectionErrorException,
)
from systembridgeconnector.models.media_directories import MediaDirectories
from systembridgeconnector.models.media_files import File as MediaFile, MediaFiles
from systembridgeconnector.models.request import Request
from systembridgeconnector.models.response import Response


class WebSocketClient(Base):
    """WebSocket Client"""

    def __init__(
        self,
        api_host: str,
        api_port: int,
        api_key: str,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._api_host = api_host
        self._api_port = api_port
        self._api_key = api_key
        self._response_futures: dict[str, asyncio.Future] = {}
        self._session: aiohttp.ClientSession | None = None
        self._websocket: aiohttp.ClientWebSocketResponse | None = None

    @property
    def connected(self) -> bool:
        """Get connection state."""
        return self._websocket is not None and not self._websocket.closed

    async def _send_message(
        self,
        request: Request,
    ) -> Response:
        """Send a message to the WebSocket"""
        if not self.connected or self._websocket is None:
            raise ConnectionClosedException("Connection is closed")

        request.api_key = self._api_key
        request.id = uuid4().hex
        future: asyncio.Future[Response] = asyncio.get_running_loop().create_future()
        self._response_futures[request.id] = future
        await self._websocket.send_str(request.json())
        self._logger.debug("Sent message: %s", request.json(exclude={EVENT_API_KEY}))
        try:
            return await future
        finally:
            self._response_futures.pop(request.id)

    async def close(self) -> None:
        """Close connection"""
        self._logger.info("Closing WebSocket connection")
        if self._websocket is not None:
            await self._websocket.close()
        if self._session is not None:
            await self._session.close()

    async def connect(
        self,
        session: aiohttp.ClientSession | None = None,
    ) -> None:
        """Connect to server"""
        if session:
            self._session = session
        else:
            self._session = aiohttp.ClientSession()
        url = f"ws://{self._api_host}:{self._api_port}/api/websocket"
        self._logger.info("Connecting to WebSocket: %s", url)
        try:
            self._websocket = await self._session.ws_connect(url=url, heartbeat=30)
        except (
            aiohttp.WSServerHandshakeError,
            aiohttp.ClientConnectionError,
            socket.gaierror,
        ) as error:
            self._logger.warning(
                "Failed to connect to WebSocket: %s - %s",
                error.__class__.__name__,
                error,
            )
            raise ConnectionErrorException from error
        self._logger.info("Connected to WebSocket")

    async def application_update(
        self,
        version: str | None = None,
    ) -> Response:
        """Update application"""
        self._logger.info("Updating application")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_APPLICATION_UPDATE,
                    EVENT_VERSION: version,
                }
            )
        )

    async def exit_backend(self) -> Response:
        """Exit backend"""
        self._logger.info("Exiting backend")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_EXIT_APPLICATION,
                }
            )
        )

    async def get_data(
        self,
        modules: list[str],
    ) -> Response:
        """Get data from server"""
        self._logger.info("Getting data from server: %s", modules)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_DATA,
                    EVENT_MODULES: modules,
                }
            )
        )

    async def get_directories(self) -> MediaDirectories:
        """Get directories"""
        self._logger.info("Getting directories:")
        response = await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_DIRECTORIES,
                }
            )
        )
        return MediaDirectories(**response.dict())

    async def get_files(
        self,
        base: str,
        path: str | None = None,
    ) -> MediaFiles:
        """Get files"""
        self._logger.info("Getting files: %s - %s", base, path)
        response = await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_FILES,
                    EVENT_BASE: base,
                    EVENT_PATH: path,
                }
            )
        )
        return MediaFiles(**response.dict())

    async def get_file(
        self,
        base: str,
        path: str,
    ) -> MediaFile:
        """Get files"""
        self._logger.info("Getting file: %s - %s", base, path)
        response = await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_FILE,
                    EVENT_BASE: base,
                    EVENT_PATH: path,
                }
            )
        )
        return MediaFile(**response.dict())

    async def register_data_listener(
        self,
        modules: list[str],
    ) -> Response:
        """Register data listener"""
        self._logger.info("Registering data listener: %s", modules)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_REGISTER_DATA_LISTENER,
                    EVENT_MODULES: modules,
                }
            )
        )

    async def keyboard_keypress(
        self,
        key: str,
    ) -> Response:
        """Keyboard keypress"""
        self._logger.info("Press key: %s", key)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_KEYBOARD_KEYPRESS,
                    EVENT_KEY: key,
                }
            )
        )

    async def keyboard_text(
        self,
        text: str,
    ) -> Response:
        """Keyboard keypress"""
        self._logger.info("Enter text: %s", text)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_KEYBOARD_TEXT,
                    EVENT_TEXT: text,
                }
            )
        )

    async def send_notification(
        self,
        message: str,
        title: str | None = None,
        app_name: str | None = None,
        app_icon: str | None = None,
        timeout: int = 5,
    ) -> Response:
        """Send notification"""
        self._logger.info("Send notification: %s", message)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_NOTIFICATION,
                    EVENT_MESSAGE: message,
                    EVENT_TITLE: title,
                    EVENT_APP_NAME: app_name,
                    EVENT_APP_ICON: app_icon,
                    EVENT_TIMEOUT: timeout,
                }
            )
        )

    async def open_path(
        self,
        path: str,
    ) -> Response:
        """Open path"""
        self._logger.info("Opening path: %s", path)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_OPEN,
                    EVENT_PATH: path,
                }
            )
        )

    async def open_url(
        self,
        url: str,
    ) -> Response:
        """Open url"""
        self._logger.info("Opening URL: %s", url)
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_OPEN,
                    EVENT_URL: url,
                }
            )
        )

    async def power_sleep(self) -> Response:
        """Power sleep"""
        self._logger.info("Power sleep")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_POWER_SLEEP,
                }
            )
        )

    async def power_hibernate(self) -> Response:
        """Power hibernate"""
        self._logger.info("Power hibernate")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_POWER_HIBERNATE,
                }
            )
        )

    async def power_restart(self) -> Response:
        """Power restart"""
        self._logger.info("Power restart")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_POWER_RESTART,
                }
            )
        )

    async def power_shutdown(self) -> Response:
        """Power shutdown"""
        self._logger.info("Power shutdown")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_POWER_SHUTDOWN,
                }
            )
        )

    async def power_lock(self) -> Response:
        """Power lock"""
        self._logger.info("Power lock")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_POWER_LOCK,
                }
            )
        )

    async def power_logout(self) -> Response:
        """Power logout"""
        self._logger.info("Power logout")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_POWER_LOGOUT,
                }
            )
        )

    async def listen(
        self,
        callback: Callable,
        accept_other_types: bool = False,
    ) -> None:
        """Listen for messages and map to modules"""

        async def _callback_message(message: dict) -> None:
            """Message Callback"""
            self._logger.debug("New message: %s", message[EVENT_TYPE])

            if message.get(EVENT_ID) is not None:
                future = self._response_futures.get(message[EVENT_ID])
                if future is not None:
                    response = Response(**message)
                    self._logger.info(
                        "Response: %s",
                        response.json(
                            include={
                                EVENT_ID,
                                EVENT_TYPE,
                                EVENT_SUBTYPE,
                                EVENT_MESSAGE,
                            },
                            exclude_unset=True,
                        ),
                    )
                    future.set_result(response)

            if message[EVENT_TYPE] == TYPE_ERROR:
                if message[EVENT_SUBTYPE] == SUBTYPE_LISTENER_ALREADY_REGISTERED:
                    self._logger.debug(message)
                else:
                    self._logger.warning("Error message: %s", message)
            elif (
                message[EVENT_TYPE] == TYPE_DATA_UPDATE
                and message[EVENT_DATA] is not None
            ):
                self._logger.debug(
                    "New data for: %s\n%s", message[EVENT_MODULE], message[EVENT_DATA]
                )
                model = MODEL_MAP.get(message[EVENT_MODULE])
                if model is None:
                    self._logger.warning("Unknown model: %s", message[EVENT_MODULE])
                else:
                    await callback(
                        message[EVENT_MODULE],
                        model(**message[EVENT_DATA]),
                    )
            else:
                self._logger.debug("Other message: %s", message[EVENT_TYPE])
                if accept_other_types:
                    model = MODEL_MAP.get(EVENT_TYPE, MODEL_MAP[MODEL_RESPONSE])
                    if model is not None:
                        await callback(
                            message[EVENT_TYPE],
                            model(**message),
                        )

        await self.listen_for_messages(callback=_callback_message)

    async def listen_for_messages(
        self,
        callback: Callable,
    ) -> None:
        """Listen for messages"""
        if not self.connected:
            raise ConnectionClosedException("Connection is closed")

        self._logger.info("Listen for messages")
        if self._websocket is not None:
            while not self._websocket.closed:
                message = await self.receive_message()
                if isinstance(message, dict):
                    await callback(message)

    async def receive_message(self) -> dict | None:
        """Receive message"""
        if not self.connected or self._websocket is None:
            raise ConnectionClosedException("Connection is closed")

        try:
            message = await self._websocket.receive()
        except RuntimeError:
            return None

        if message.type == aiohttp.WSMsgType.ERROR:
            raise ConnectionErrorException(self._websocket.exception())

        if message.type in (
            aiohttp.WSMsgType.CLOSE,
            aiohttp.WSMsgType.CLOSED,
            aiohttp.WSMsgType.CLOSING,
        ):
            raise ConnectionClosedException("Connection closed to server")

        if message.type == aiohttp.WSMsgType.TEXT:
            message_json = message.json()

            if (
                message_json[EVENT_TYPE] == TYPE_ERROR
                and message_json[EVENT_SUBTYPE] == SUBTYPE_BAD_API_KEY
            ):
                raise AuthenticationException(message_json[EVENT_MESSAGE])

            return message_json

        raise BadMessageException(f"Unknown message type: {message.type}")
