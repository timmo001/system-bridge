"""System Bridge Shared: WebSocket Client"""
from __future__ import annotations

import asyncio
import json
import websockets

from websockets.exceptions import ConnectionClosed, InvalidHandshake, InvalidMessage

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
    BadMessageException,
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

    async def connect(self) -> None:
        """Connect to server"""
        url = f"ws://localhost:{self._settings.get(SETTING_PORT_API)}/api/websocket"
        self._logger.info("Connecting to WebSocket: %s", url)
        try:
            self._websocket = await websockets.connect(url)
        except (
            asyncio.TimeoutError,
            ConnectionRefusedError,
            InvalidHandshake,
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
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_EXIT_APPLICATION,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def get_data(
        self,
        modules: list[str],
    ) -> None:
        """Get data from server"""
        self._logger.info("Getting data from server: %s", modules)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_GET_DATA,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                        "modules": modules,
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def register_data_listener(
        self,
        modules: list[str],
    ) -> None:
        """Register data listener"""
        self._logger.info("Registering data listener: %s", modules)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_REGISTER_DATA_LISTENER,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                        "modules": modules,
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def keyboard_keypress(
        self,
        key: str,
    ) -> None:
        """Keyboard keypress"""
        self._logger.info("Press key: %s", key)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_KEYBOARD_KEYPRESS,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                        "key": key,
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def keyboard_text(
        self,
        text: str,
    ) -> None:
        """Keyboard keypress"""
        self._logger.info("Enter text: %s", text)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_KEYBOARD_TEXT,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                        "text": text,
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def open_path(
        self,
        path: str,
    ) -> None:
        """Open path"""
        self._logger.info("Opening path: %s", path)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_OPEN,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                        "url": path,
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def open_url(
        self,
        url: str,
    ) -> None:
        """Open url"""
        self._logger.info("Opening URL: %s", url)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_OPEN,
                        "api-key": self._settings.get_secret(SECRET_API_KEY),
                        "url": url,
                    }
                )
            )
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
        except (InvalidMessage) as error:
            raise ConnectionErrorException from error
        except (InvalidHandshake) as error:
            raise BadMessageException from error

    async def listen_for_messages(
        self,
        callback: callable,
    ) -> None:
        """Listen for messages"""
        self._logger.info("Listen for messages")
        while True:
            await asyncio.sleep(0)
            try:
                message = await self._websocket.recv()
                await callback(json.loads(message))
            except ConnectionClosed as error:
                raise ConnectionClosedException from error

    async def listen_for_message(self) -> dict:
        """Listen for message"""
        self._logger.info("Listen for message")
        try:
            message = await self._websocket.recv()
            return json.loads(message)
        except ConnectionClosed as error:
            raise ConnectionClosedException from error
