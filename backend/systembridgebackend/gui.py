"""System Bridge: GUI"""
import asyncio
import subprocess
import sys
from threading import Event, Thread
from typing import Callable, Optional

from systembridgeshared.base import Base
from systembridgeshared.exceptions import ConnectionErrorException
from systembridgeshared.settings import Settings
from systembridgeshared.websocket_client import WebSocketClient


class GUI(Base):
    """GUI"""

    def __init__(
        self,
        settings: Settings,
    ):
        """Initialize"""
        super().__init__()
        self._settings = settings
        self._process: Optional[subprocess.Popen] = None

    async def start(  # pylint: disable=keyword-arg-before-vararg
        self,
        failed_callback: Optional[Callable[[], None]],
        attempt: int = 1,
        command: str = "main",
        *args,
    ) -> None:
        """Start the GUI"""
        if attempt > 2:
            self._logger.error("Failed to start GUI after 2 attempts")
            if failed_callback is not None:
                failed_callback()
            return
        if command == "main":
            self._logger.info(
                "Test WebSocket connection before starting GUI. Attempt #%s", attempt
            )
            websocket_client = WebSocketClient(self._settings)
            try:
                await websocket_client.connect()
                await websocket_client.close()
            except ConnectionErrorException:
                self._logger.warning(
                    "Could not connect to WebSocket. Retrying in 5 seconds"
                )
                await asyncio.sleep(5)
                await self.start(
                    failed_callback,
                    attempt + 1,
                    command,
                    *args,
                )
                return

        pgm_args = [
            sys.executable,
            "-m",
            "systembridgegui",
            command,
            *args,
        ]

        self._logger.info("Starting GUI: %s", pgm_args)
        with subprocess.Popen(pgm_args) as self._process:
            self._logger.info("GUI started with PID: %s", self._process.pid)
            if (exit_code := self._process.wait()) != 0:
                self._logger.error("GUI exited with code: %s", exit_code)
                await self.start(
                    failed_callback,
                    attempt + 1,
                    command,
                    *args,
                )
            self._logger.info("GUI exited with code: %s", exit_code)

    def stop(self) -> None:
        """Stop the GUI"""
        if self._process:
            self._logger.info("Stopping GUI")
            self._process.terminate()
            self._process.wait()
            self._logger.info("GUI stopped")
            self._process = None
