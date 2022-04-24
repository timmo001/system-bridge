"""System Bridge Connector: WebSocket Client"""
from __future__ import annotations

import asyncio
import json

from websockets.client import connect
from websockets.exceptions import ConnectionClosed, InvalidHandshake, InvalidMessage

from systembridgeconnector.base import Base
from systembridgeconnector.const import (
    TYPE_EXIT_APPLICATION,
    TYPE_GET_DATA,
    TYPE_OPEN,
    TYPE_REGISTER_DATA_LISTENER,
)
from systembridgeconnector.exceptions import (
    BadMessageException,
    ConnectionClosedException,
    ConnectionErrorException,
)


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
        url = f"ws://{self._api_host}:{self._api_port}/api/websocket"
        self._logger.info("Connecting to WebSocket: %s", url)
        try:
            self._websocket = await connect(url)
        except (
            asyncio.exceptions.TimeoutError,
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
                        "api-key": self._api_key,
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
                        "api-key": self._api_key,
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
                        "api-key": self._api_key,
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

    async def open_path(
        self,
        path: str,
    ) -> None:
        """Register data listener"""
        self._logger.info("Opening path: %s", path)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_OPEN,
                        "api-key": self._api_key,
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
        """Register data listener"""
        self._logger.info("Opening URL: %s", url)
        try:
            await self._websocket.send(
                json.dumps(
                    {
                        "event": TYPE_OPEN,
                        "api-key": self._api_key,
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
