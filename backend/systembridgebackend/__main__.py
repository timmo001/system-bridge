"""System Bridge: Main"""
import asyncio
import logging
import os
import sys

from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_AUTOSTART, SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

from .modules.listeners import Listeners
from .modules.system import System
from .server import Server
from .utilities.autostart import autostart_disable, autostart_enable
from .utilities.shortcuts import create_shortcuts


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        if "--init" in sys.argv:
            self._logger.info("Initialized application. Exiting now.")
            sys.exit(0)

        self._logger.info("System Bridge %s: Startup", System().version())

        if "--cli" not in sys.argv:
            autostart = settings.get(SETTING_AUTOSTART)
            self._logger.info("Autostart enabled: %s", autostart)
            if autostart:
                autostart_enable()
            else:
                autostart_disable()

            create_shortcuts()

        implemented_modules = []
        for _, dirs, _ in os.walk(os.path.join(os.path.dirname(__file__), "./modules")):
            implemented_modules = list(filter(lambda d: "__" not in d, dirs))
            break

        listeners = Listeners(database, implemented_modules)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        self._server = Server(
            database,
            settings,
            listeners,
            implemented_modules,
        )
        loop.run_until_complete(self._server.start())


if __name__ == "__main__":

    database = Database()
    settings = Settings(database)

    LOG_LEVEL = str(settings.get(SETTING_LOG_LEVEL))
    logger = setup_logger(LOG_LEVEL, "system-bridge")
    logging.getLogger("zeroconf").setLevel(logging.ERROR)

    try:
        Main()
    except Exception as exception:  # pylint: disable=broad-except
        logger.fatal("Unhandled error in application", exc_info=exception)
