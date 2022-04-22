"""System Bridge Shared: WebSocket Client"""
from __future__ import annotations
import asyncio
import json
import websockets

from websockets import ConnectionClosed, InvalidHandshake, InvalidMessage

from systembridgeshared.base import Base
from systembridgeshared.const import (
    SECRET_API_KEY,
    SETTING_PORT_API,
    TYPE_GET_DATA,
    TYPE_REGISTER_DATA_LISTENER,
)
from systembridgeshared.exceptions import ConnectionClosedException
from systembridgeshared.settings import Settings


class WebSocketClient(Base):
    """WebSocket Client"""

    def __init__(
        self,
        settings: Settings,
    ) -> None:
        """Initialize"""
        self._settings = settings
        self._websocket = None

    @property
    def connected(self) -> bool:
        """Get connection state."""
        return self._websocket is not None and not self._websocket.closed

    async def close(self) -> None:
        if self._websocket is not None:
            await self._websocket.close()
            self._websocket = None

    async def connect(self) -> None:
        try:
            self._websocket = await websockets.connect(
                f"ws://localhost:{self._settings.get(SETTING_PORT_API)}/api/websocket"
            )
        except InvalidHandshake as error:
            raise Exception from error

    async def get_data(
        self,
        modules: list[str],
    ) -> None:
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
        except (InvalidMessage, InvalidHandshake) as error:
            raise Exception from error

    async def get_data(
        self,
        modules: list[str],
    ) -> None:
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
        except (InvalidMessage, InvalidHandshake) as error:
            raise Exception from error

    async def listen_for_messages(self, callback: callable) -> None:
        while True:
            await asyncio.sleep(0)
            try:
                message = await self._websocket.recv()
                await callback(json.loads(message))
            except ConnectionClosed as error:
                raise ConnectionClosedException from error
