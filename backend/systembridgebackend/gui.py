"""System Bridge: GUI"""
import asyncio
import subprocess
import sys
from threading import Event, Thread
from typing import Callable, Optional

import async_timeout
from systembridgeshared.base import Base
from systembridgeshared.exceptions import ConnectionErrorException
from systembridgeshared.settings import Settings
from systembridgeshared.websocket_client import WebSocketClient


class StoppableThread(Thread):
    """Thread class with a stop() method. The thread itself has to check
    regularly for the stopped() condition."""

    def __init__(
        self,
        *args,
        **kwargs,
    ) -> None:
        """Initialize the thread."""
        super().__init__(*args, **kwargs)
        self._stop_event = Event()

    def stop(self) -> None:
        """Stop the thread."""
        self._stop_event.set()

    def stopped(self) -> bool:
        """Return if the thread is stopped."""
        return self._stop_event.is_set()


class GUI(Base):
    """GUI"""

    def __init__(
        self,
        settings: Settings,
    ):
        """Initialize"""
        super().__init__()
        self._settings = settings

        self._name = "GUI"
        self._process: Optional[subprocess.Popen] = None
        self._stopping = False
        self._thread: Optional[StoppableThread] = None

    async def _start(  # pylint: disable=keyword-arg-before-vararg
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
                async with async_timeout.timeout(20):
                    await websocket_client.connect()
                    await websocket_client.close()
            except ConnectionErrorException:
                self._logger.warning(
                    "Could not connect to WebSocket. Retrying in 5 seconds"
                )
                await asyncio.sleep(5)
                await self._start(
                    failed_callback,
                    attempt + 1,
                    command,
                    *args,
                )
                return
            except asyncio.TimeoutError:
                self._logger.warning(
                    "Connection timeout to WebSocket. Retrying in 5 seconds"
                )
                await asyncio.sleep(5)
                await self._start(
                    failed_callback,
                    attempt + 1,
                    command,
                    *args,
                )
                return

        self._logger.info("Connection test passed")

        pgm_args = [
            sys.executable,
            "-m",
            "systembridgegui",
            command,
            *args,
        ]

        self._name = command

        self._logger.info("Starting GUI: %s", pgm_args)
        with subprocess.Popen(pgm_args) as self._process:
            self._logger.info("GUI started with PID: %s", self._process.pid)
            if (exit_code := self._process.wait()) != 0:
                if not self._stopping:
                    self._logger.error("GUI exited with code: %s", exit_code)
                    await self._start(
                        failed_callback,
                        attempt + 1,
                        command,
                        *args,
                    )
                    return
            self._logger.info("GUI exited with code: %s", exit_code)

    def _start_gui_sync(  # pylint: disable=keyword-arg-before-vararg
        self,
        failed_callback: Optional[Callable[[], None]],
        command: str = "main",
        *args,
    ) -> None:
        """Start the GUI in a synchronous thread"""
        asyncio.run(
            self._start(
                failed_callback,
                1,
                command,
                *args,
            )
        )

    async def start(  # pylint: disable=keyword-arg-before-vararg
        self,
        failed_callback: Optional[Callable[[], None]],
        command: str = "main",
        *args,
    ) -> None:
        """Start the GUI"""
        self._thread = StoppableThread(
            target=self._start_gui_sync,
            args=(
                failed_callback,
                command,
                *args,
            ),
        )
        self._thread.start()
        self._stopping = False

    def stop(self) -> None:
        """Stop the GUI"""
        self._logger.info("Stopping GUI: %s", self._name)
        self._stopping = True
        if self._process is not None:
            self._process.terminate()
            self._process.wait()
            self._process = None
            self._logger.info("GUI stopped")
        if self._thread is not None:
            self._thread.stop()
