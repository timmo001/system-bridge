"""System Bridge: Main"""
import asyncio
import logging

from systembridgebackend.server import Server
from systembridgeshared.base import Base
from systembridgeshared.const import SETTING_LOG_LEVEL
from systembridgeshared.database import Database
from systembridgeshared.logger import setup_logger
from systembridgeshared.settings import Settings


class Main(Base):
    """Main"""

    def __init__(self) -> None:
        """Initialize"""
        super().__init__()
        self._logger.info("System Bridge: Startup")

        self._server = Server(database, settings)

        # Start the server
        self._server.start()


if __name__ == "__main__":
    asyncio.set_event_loop(asyncio.new_event_loop())

    database = Database()
    settings = Settings(database)

    log_level = settings.get(SETTING_LOG_LEVEL)

    setup_logger(log_level, "system-bridge")
    logging.getLogger("zeroconf").setLevel(logging.ERROR)

    Main()
