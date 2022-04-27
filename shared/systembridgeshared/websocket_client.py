"""System Bridge Shared: WebSocket Client"""
from __future__ import annotations
import aiohttp
import json
import socket

from systembridgeshared.base import Base
from systembridgeshared.const import (
    SECRET_API_KEY,
    SETTING_PORT_API,
    TYPE_EXIT_APPLICATION,
    TYPE_GET_DATA,
    TYPE_KEYBOARD_KEYPRESS,
    TYPE_KEYBOARD_TEXT,
    TYPE_OPEN,
    TYPE_REGISTER_DATA_LISTENER,
)
from systembridgeshared.exceptions import (
    ConnectionClosedException,
    ConnectionErrorException,
)
from systembridgeshared.settings import Settings


class WebSocketClient(Base):
    """WebSocket Client"""

    def __init__(
        self,
        settings: Settings,
    ) -> None:
        """Initialize"""
        super().__init__()
        self._settings = settings
        self._session = aiohttp.ClientSession()
        self._websocket = None

    @property
    def connected(self) -> bool:
        """Get connection state."""
        return self._websocket is not None and not self._websocket.closed

    async def close(self) -> None:
        """Close connection"""
        self._logger.info("Closing WebSocket connection")
        if self._websocket is not None:
            await self._websocket.close()
            self._websocket = None
        if self._session is not None:
            await self._session.close()

    async def connect(self) -> None:
        """Connect to server"""
        url = f"ws://localhost:{self._settings.get(SETTING_PORT_API)}/api/websocket"
        self._logger.info("Connecting to WebSocket: %s", url)
        try:
            self._websocket = await self._session.ws_connect(url=url, heartbeat=30)
        except (
            aiohttp.WSServerHandshakeError,
            aiohttp.ClientConnectionError,
            socket.gaierror,
        ) as error:
            self._logger.error(
                "Failed to connect to WebSocket: %s - %s",
                error.__class__.__name__,
                error,
            )
            raise ConnectionErrorException from error
        self._logger.info("Connected to WebSocket")

    async def exit_backend(self) -> None:
        """Exit backend"""
        self._logger.info("Exiting backend")
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_EXIT_APPLICATION,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                }
            )
        )

    async def get_data(
        self,
        modules: list[str],
    ) -> None:
        """Get data from server"""
        self._logger.info("Getting data from server: %s", modules)
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_GET_DATA,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                    "modules": modules,
                }
            )
        )

    async def register_data_listener(
        self,
        modules: list[str],
    ) -> None:
        """Register data listener"""
        self._logger.info("Registering data listener: %s", modules)
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_REGISTER_DATA_LISTENER,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                    "modules": modules,
                }
            )
        )

    async def keyboard_keypress(
        self,
        key: str,
    ) -> None:
        """Keyboard keypress"""
        self._logger.info("Press key: %s", key)
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_KEYBOARD_KEYPRESS,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                    "key": key,
                }
            )
        )

    async def keyboard_text(
        self,
        text: str,
    ) -> None:
        """Keyboard keypress"""
        self._logger.info("Enter text: %s", text)
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_KEYBOARD_TEXT,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                    "text": text,
                }
            )
        )

    async def open_path(
        self,
        path: str,
    ) -> None:
        """Open path"""
        self._logger.info("Opening path: %s", path)
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_OPEN,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                    "url": path,
                }
            )
        )

    async def open_url(
        self,
        url: str,
    ) -> None:
        """Open url"""
        self._logger.info("Opening URL: %s", url)
        await self._websocket.send_str(
            json.dumps(
                {
                    "event": TYPE_OPEN,
                    "api-key": self._settings.get_secret(SECRET_API_KEY),
                    "url": url,
                }
            )
        )

    async def listen_for_messages(
        self,
        callback: callable,
    ) -> None:
        """Listen for messages"""
        self._logger.info("Listen for messages")
        while not self._websocket.closed:
            callback(await self.receive_message())

    async def receive_message(self) -> dict:
        """Receive message"""
        message = await self._websocket.receive()

        if message.type == aiohttp.WSMsgType.ERROR:
            raise ConnectionErrorException(self._websocket.exception())

        if message.type == aiohttp.WSMsgType.TEXT:
            return json.loads(message)

        if message.type in (
            aiohttp.WSMsgType.CLOSE,
            aiohttp.WSMsgType.CLOSED,
            aiohttp.WSMsgType.CLOSING,
        ):
            raise ConnectionClosedException("Connection closed to server")
