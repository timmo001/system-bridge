"""System Bridge: Main"""
import asyncio
import logging
import sys

from systembridgeshared.const import (
    SETTING_AUTOSTART,
    SETTING_LOG_LEVEL,
    SETTING_PORT_API,
)
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings
import uvicorn

from .autostart import autostart_disable, autostart_enable
from .modules.system import System
from .server import app
from .server.mdns import MDNSAdvertisement
from .shortcut import create_shortcuts


async def start_server() -> None:
    """Start Server"""
    logger.info("Starting server")
    await server.serve()


async def stop_server() -> None:
    """Stop Server"""
    logger.info("Stopping server")
    await server.shutdown()
    logger.info("Cancel any pending tasks")
    for pending_task in asyncio.all_tasks():
        pending_task.cancel()
    logger.info("Stop the event loop")


if __name__ == "__main__":

    database = Database()
    settings = Settings(database)

    LOG_LEVEL = str(settings.get(SETTING_LOG_LEVEL))
    setup_logger(LOG_LEVEL, "system-bridge")
    logging.getLogger("zeroconf").setLevel(logging.ERROR)

    logger = logging.getLogger(__name__)

    if "--init" in sys.argv:
        logger.info("Initialized application. Exiting now.")
        sys.exit(0)

    logger.info("System Bridge %s: Startup", System().version())

    if "--cli" not in sys.argv:
        autostart = settings.get(SETTING_AUTOSTART)
        logger.info("Autostart enabled: %s", autostart)
        if autostart:
            autostart_enable()
        else:
            autostart_disable()

        create_shortcuts()

    mdns_advertisement = MDNSAdvertisement(settings)
    mdns_advertisement.advertise_server()

    if (port := settings.get(SETTING_PORT_API)) is None:
        raise ValueError("Port not set")
    log_level = settings.get(SETTING_LOG_LEVEL)
    logger.info("Configuring server for port: %s", port)

    config = uvicorn.Config(
        app,
        port=int(port),  # type: ignore
        log_level=str(log_level).lower() if log_level is not None else "info",
    )
    server = uvicorn.Server(config)

    asyncio.run(start_server())
