"""System Bridge Shared: WebSocket Client"""
from __future__ import annotations

import asyncio
import json

from websockets.client import connect
from websockets.exceptions import ConnectionClosed, InvalidHandshake, InvalidMessage

from systembridgeshared.base import Base
from systembridgeshared.const import (
    SECRET_API_KEY,
    SETTING_PORT_API,
    TYPE_EXIT_APPLICATION,
    TYPE_GET_DATA,
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
        if self._websocket is not None:
            await self._websocket.close()
            self._websocket = None

    async def connect(self) -> None:
        """Connect to server"""
        try:
            self._websocket = await connect(
                f"ws://localhost:{self._settings.get(SETTING_PORT_API)}/api/websocket"
            )
        except (
            asyncio.exceptions.TimeoutError,
            ConnectionRefusedError,
            InvalidHandshake,
        ) as error:
            raise ConnectionErrorException from error

    async def exit_backend(self) -> None:
        """Exit backend"""
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

    async def listen_for_messages(self, callback: callable) -> None:
        """Listen for messages"""
        while True:
            await asyncio.sleep(0)
            try:
                message = await self._websocket.recv()
                await callback(json.loads(message))
            except ConnectionClosed as error:
                raise ConnectionClosedException from error
