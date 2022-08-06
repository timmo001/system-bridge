"""System Bridge Shared: WebSocket Client"""
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
import socket
from typing import Any, Optional
from uuid import uuid4

import aiohttp

from .base import Base
from .const import (
    EVENT_API_KEY,
    EVENT_DATA,
    EVENT_EVENT,
    EVENT_ID,
    EVENT_MESSAGE,
    EVENT_MODULE,
    EVENT_SUBTYPE,
    EVENT_TYPE,
    MODEL_MAP,
    MODEL_RESPONSE,
    SECRET_API_KEY,
    SETTING_PORT_API,
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
from .exceptions import (
    AuthenticationException,
    BadMessageException,
    ConnectionClosedException,
    ConnectionErrorException,
)
from .models.get_data import GetData
from .models.keyboard_key import KeyboardKey
from .models.keyboard_text import KeyboardText
from .models.media_directories import MediaDirectories
from .models.media_files import File as MediaFile, MediaFiles
from .models.media_get_file import MediaGetFile
from .models.media_get_files import MediaGetFiles
from .models.notification import Notification
from .models.open_path import OpenPath
from .models.open_url import OpenUrl
from .models.register_data_listener import RegisterDataListener
from .models.request import Request
from .models.response import Response
from .models.update import Update
from .settings import Settings


class WebSocketClient(Base):
    """WebSocket Client"""

    def __init__(
        self,
        settings: Settings,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._settings = settings
        self._responses: dict[str, tuple[asyncio.Future[Response], Optional[str]]] = {}
        self._session: Optional[aiohttp.ClientSession] = None
        self._websocket: Optional[aiohttp.ClientWebSocketResponse] = None
        self._api_key = self._settings.get_secret(SECRET_API_KEY)

    @property
    def connected(self) -> bool:
        """Get connection state."""
        return self._websocket is not None and not self._websocket.closed

    async def _send_message(
        self,
        request: Request,
        wait_for_response: bool = True,
        response_type: Optional[str] = None,
    ) -> Response:
        """Send a message to the WebSocket"""
        if not self.connected or self._websocket is None:
            raise ConnectionClosedException("Connection is closed")

        request.api_key = self._api_key
        request.id = uuid4().hex
        future: asyncio.Future[Response] = asyncio.get_running_loop().create_future()
        self._responses[request.id] = future, response_type
        await self._websocket.send_str(request.json())
        self._logger.debug("Sent message: %s", request.json(exclude={EVENT_API_KEY}))
        if wait_for_response:
            try:
                return await future
            finally:
                self._responses.pop(request.id)
        return Response(
            **{
                EVENT_ID: request.id,
                EVENT_TYPE: "N/A",
                EVENT_MESSAGE: "Message sent",
            }
        )

    async def close(self) -> None:
        """Close connection"""
        self._logger.info("Closing WebSocket connection")
        if self._websocket is not None:
            await self._websocket.close()
        if self._session is not None:
            await self._session.close()

    async def connect(
        self,
        session: Optional[aiohttp.ClientSession] = None,
    ) -> None:
        """Connect to server"""
        if session:
            self._session = session
        else:
            self._session = aiohttp.ClientSession()
        url = f"ws://localhost:{self._settings.get(SETTING_PORT_API)}/api/websocket"
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
        model: Update,
    ) -> Response:
        """Update application"""
        self._logger.info("Updating application")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_APPLICATION_UPDATE,
                    **model.dict(),
                }
            ),
            wait_for_response=False,
        )

    async def exit_backend(self) -> Response:
        """Exit backend"""
        self._logger.info("Exiting backend")
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_EXIT_APPLICATION,
                }
            ),
            wait_for_response=False,
        )

    async def get_data(
        self,
        model: GetData,
    ) -> Response:
        """Get data from server"""
        self._logger.info("Getting data from server: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_DATA,
                    **model.dict(),
                }
            ),
            response_type=TYPE_DATA_UPDATE,
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
        model: MediaGetFiles,
    ) -> MediaFiles:
        """Get files"""
        self._logger.info("Getting files: %s", model.json())
        response = await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_FILES,
                    **model.dict(),
                }
            )
        )
        return MediaFiles(**response.dict())

    async def get_file(
        self,
        model: MediaGetFile,
    ) -> MediaFile:
        """Get files"""
        self._logger.info("Getting file: %s", model.json())
        response = await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_GET_FILE,
                    **model.dict(),
                }
            )
        )
        return MediaFile(**response.dict())

    async def register_data_listener(
        self,
        model: RegisterDataListener,
    ) -> Response:
        """Register data listener"""
        self._logger.info("Registering data listener: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_REGISTER_DATA_LISTENER,
                    **model.dict(),
                }
            )
        )

    async def keyboard_keypress(
        self,
        model: KeyboardKey,
    ) -> Response:
        """Keyboard keypress"""
        self._logger.info("Press key: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_KEYBOARD_KEYPRESS,
                    **model.dict(),
                }
            )
        )

    async def keyboard_text(
        self,
        model: KeyboardText,
    ) -> Response:
        """Keyboard keypress"""
        self._logger.info("Enter text: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_KEYBOARD_TEXT,
                    **model.dict(),
                }
            )
        )

    async def send_notification(
        self,
        model: Notification,
    ) -> Response:
        """Send notification"""
        self._logger.info("Send notification: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_NOTIFICATION,
                    **model.dict(),
                }
            )
        )

    async def open_path(
        self,
        model: OpenPath,
    ) -> Response:
        """Open path"""
        self._logger.info("Opening path: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_OPEN,
                    **model.dict(),
                }
            )
        )

    async def open_url(
        self,
        model: OpenUrl,
    ) -> Response:
        """Open url"""
        self._logger.info("Opening URL: %s", model.json())
        return await self._send_message(
            Request(
                **{
                    EVENT_EVENT: TYPE_OPEN,
                    **model.dict(),
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
        callback: Optional[Callable[[str, Any], Awaitable[None]]] = None,
        accept_other_types: bool = False,
    ) -> None:
        """Listen for messages and map to modules"""

        async def _callback_message(message: dict) -> None:
            """Message Callback"""
            self._logger.debug("New message: %s", message[EVENT_TYPE])

            if message.get(EVENT_ID) is not None:
                response_tuple = self._responses.get(message[EVENT_ID])
                if response_tuple is not None:
                    future, response_type = response_tuple
                    if (
                        response_type is not None
                        and response_type != message[EVENT_TYPE]
                    ):
                        self._logger.info(
                            "Response type '%s' does not match requested type '%s'.",
                            message[EVENT_TYPE],
                            response_type,
                        )
                    else:
                        response = Response(**message)

                        if (
                            response.type == TYPE_DATA_UPDATE
                            and response.module is not None
                            and message[EVENT_DATA] is not None
                        ):
                            # Find model from module
                            model = MODEL_MAP.get(message[EVENT_MODULE])
                            if model is None:
                                self._logger.warning(
                                    "Unknown model: %s", message[EVENT_MODULE]
                                )
                            else:
                                response.data = model(**message[EVENT_DATA])

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

                        try:
                            future.set_result(response)
                        except asyncio.InvalidStateError:
                            self._logger.warning(
                                "Future already set for response ID: %s",
                                message[EVENT_ID],
                            )

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
                    if callback is not None:
                        await callback(
                            message[EVENT_MODULE],
                            model(**message[EVENT_DATA]),
                        )
            else:
                self._logger.debug("Other message: %s", message[EVENT_TYPE])
                if accept_other_types:
                    model = MODEL_MAP.get(EVENT_TYPE, MODEL_MAP[MODEL_RESPONSE])
                    if model is not None and callback is not None:
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

    async def receive_message(self) -> Optional[dict]:
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
