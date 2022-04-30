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


async def start_gui(
    logger: Logger,
    settings: Settings,
    attempt=1,
) -> None:
    """Start the GUI"""
    if attempt > 2:
        logger.error("Failed to start GUI after 2 attempts")
        raise GUIAttemptsExceededException("Failed to start GUI after 3 attempts")
    logger.info("Test WebSocket connection before starting GUI. Attempt #%s", attempt)
    websocket_client = WebSocketClient(settings)
    try:
        await websocket_client.connect()
        await websocket_client.close()
    except ConnectionErrorException:
        logger.warning("Could not connect to WebSocket. Retrying in 5 seconds")
        await asyncio.sleep(5)
        await start_gui(logger, settings, attempt + 1)
        return

    logger.info("Executable: %s", sys.executable)
    logger.info("Starting GUI")
    with subprocess.Popen(
        [
            sys.executable,
            "-m",
            "systembridgegui",
        ]
    ) as process:
        logger.info("GUI started with PID: %s", process.pid)
        if (exit_code := process.wait()) != 0:
            logger.error("GUI exited with code: %s", exit_code)
            await start_gui(logger, settings, attempt + 1)
            return
        logger.info("GUI exited with code: %s", exit_code)


def start_gui_sync(
    logger: Logger,
    settings: Settings,
) -> None:
    """Start the GUI in a synchronous thread"""
    asyncio.run(start_gui(logger, settings))


async def start_gui_threaded(
    logger: Logger,
    settings: Settings,
) -> None:
    """Start the GUI in a thread"""
    thread = Thread(target=start_gui_sync, args=(logger, settings))
    thread.start()
