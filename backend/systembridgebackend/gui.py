"""System Bridge: GUI"""
import asyncio
from logging import Logger
import subprocess
import sys
from threading import Thread

from systembridgeshared.exceptions import ConnectionErrorException
from systembridgeshared.settings import Settings
from systembridgeshared.websocket_client import WebSocketClient


class GUIAttemptsExceededException(BaseException):
    """Raise this when the GUI attempts to start more too many times."""


async def start_gui(  # pylint: disable=keyword-arg-before-vararg
    logger: Logger,
    settings: Settings,
    attempt: int = 1,
    command: str = "main",
    *args,
) -> None:
    """Start the GUI"""
    if attempt > 2:
        logger.error("Failed to start GUI after 2 attempts")
        raise GUIAttemptsExceededException("Failed to start GUI after 3 attempts")
    if command == "main":
        logger.info(
            "Test WebSocket connection before starting GUI. Attempt #%s", attempt
        )
        websocket_client = WebSocketClient(settings)
        try:
            await websocket_client.connect()
            await websocket_client.close()
        except ConnectionErrorException:
            logger.warning("Could not connect to WebSocket. Retrying in 5 seconds")
            await asyncio.sleep(5)
            await start_gui(
                logger,
                settings,
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

    logger.info("Starting GUI: %s", pgm_args)
    with subprocess.Popen(pgm_args) as process:
        logger.info("GUI started with PID: %s", process.pid)
        if (exit_code := process.wait()) != 0:
            logger.error("GUI exited with code: %s", exit_code)
            await start_gui(
                logger,
                settings,
                attempt + 1,
                command,
                *args,
            )
            return
        logger.info("GUI exited with code: %s", exit_code)


def start_gui_sync(  # pylint: disable=keyword-arg-before-vararg
    logger: Logger,
    settings: Settings,
    command: str = "main",
    *args,
) -> None:
    """Start the GUI in a synchronous thread"""
    asyncio.run(
        start_gui(
            logger,
            settings,
            1,
            command,
            *args,
        )
    )


def start_gui_threaded(  # pylint: disable=keyword-arg-before-vararg
    logger: Logger,
    settings: Settings,
    command: str = "main",
    *args,
) -> None:
    """Start the GUI in a thread"""
    thread = Thread(
        target=start_gui_sync,
        args=(
            logger,
            settings,
            command,
            *args,
        ),
    )
    thread.start()
