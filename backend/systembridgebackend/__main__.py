"""System Bridge: Main"""
import logging
import sys

import uvicorn
from systembridgeshared.base import Base
from systembridgeshared.const import (
    SETTING_AUTOSTART,
    SETTING_LOG_LEVEL,
    SETTING_PORT_API,
)
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings

from .autostart import autostart_disable, autostart_enable
from .modules.system import System
from .server import app
from .shortcut import create_shortcuts


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

        port = int(str(settings.get(SETTING_PORT_API)))

        uvicorn.run(
            app,
            port=port,
            log_level=log_level.lower(),
        )


if __name__ == "__main__":

    database = Database()
    settings = Settings(database)

    log_level = str(settings.get(SETTING_LOG_LEVEL))
    logger = setup_logger(log_level, "system-bridge")
    logging.getLogger("zeroconf").setLevel(logging.ERROR)

    Main()
